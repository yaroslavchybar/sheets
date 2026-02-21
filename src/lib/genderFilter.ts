import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { getLanguageIdentificationModel } from "fasttext.wasm.js";

/**
 * Gender classification for Instagram accounts.
 * Ported from Python datauploader/filter_instagram.py
 */

async function loadKeywordsFromDb(filename: string): Promise<Set<string>> {
    try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(/\/$/, "");
        const client = new ConvexHttpClient(url);
        const content = await client.query(api.keywords.get, { filename });
        const words = new Set<string>();
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                words.add(trimmed.toLowerCase());
            }
        }
        return words;
    } catch (e) {
        console.warn(`Warning: keyword file '${filename}' failed to load from DB.`, e);
        return new Set();
    }
}

export interface KeywordSets {
    usMaleNames: Set<string>;
}

export async function fetchAllKeywordSets(): Promise<KeywordSets> {
    const usMaleNames = await loadKeywordsFromDb("us_male_names.txt");
    return { usMaleNames };
}

let _fastTextModel: any = null;
async function getFastText() {
    if (!_fastTextModel) {
        try {
            _fastTextModel = await getLanguageIdentificationModel();
            await _fastTextModel.load();
        } catch (e) {
            console.error("FastText load error:", e);
        }
    }
    return _fastTextModel;
}

/**
 * Check if text is mostly English using fasttext.
 */
async function isEnglish(text: string): Promise<boolean> {
    if (!text || !text.trim()) return true; // empty names pass

    // Check if it's strictly ascii regex-wise as a fast bypass, 
    // but names like François might be French or English. Let's just use fasttext.
    const ft = await getFastText();
    if (!ft) return true; // fallback to true if failed to load

    try {
        const res = await ft.model.predict(text.trim() + "\n", 1, 0.0);
        if (!res || typeof res.size !== 'function' || res.size() === 0) {
            if (res && typeof res.delete === 'function') res.delete();
            return true;
        }

        const pair = res.get(0);
        const label = pair[1]; // e.g., __label__en

        if (res && typeof res.delete === 'function') res.delete();

        // Returning whether top detected language is English
        return label === "__label__en";
    } catch (e) {
        console.error("FastText predict error:", e);
        return true; // fail securely
    }
}

const FEMALE_ENDINGS = ["a", "ya", "ia", "ina", "ova", "eva", "skaya", "ivna", "yivna", "ovna"];

function normalizeText(text: string): string {
    const normMap: Record<string, string> = {
        "ᴀ": "a", "ʙ": "b", "ᴄ": "c", "ᴅ": "d", "ᴇ": "e", "ꜰ": "f", "ɢ": "g", "ʜ": "h",
        "ɪ": "i", "ᴊ": "j", "ᴋ": "k", "ʟ": "l", "ᴍ": "m", "ɴ": "n", "ᴏ": "o", "ᴘ": "p",
        "ǫ": "q", "ʀ": "r", "ꜱ": "s", "ᴛ": "t", "ᴜ": "u", "ᴠ": "v", "ᴡ": "w",
        "ʏ": "y", "ᴢ": "z",
    };
    let result = text;
    for (const [char, replacement] of Object.entries(normMap)) {
        result = result.replaceAll(char, replacement);
    }
    return result;
}

/**
 * Classify a profile using a multi-step priority system.
 * Returns 'female' for removal, or 'keep' to keep the profile.
 */
export function classifyGender(username: string, fullname: string, keywordSets: KeywordSets): "female" | "keep" {
    const combinedText = `${username} ${fullname}`.toLowerCase();
    if (!combinedText.trim()) return "keep";

    const normalizedText = normalizeText(combinedText);
    const cleanedText = normalizedText.replace(/[^a-zа-яёїієґ]+/g, " ");
    const parts = new Set(cleanedText.split(/\s+/).filter(Boolean));

    // Check female endings on the parts
    for (const part of parts) {
        if (part.length > 3) {
            for (const ending of FEMALE_ENDINGS) {
                if (part.endsWith(ending)) return "female";
            }
        }
    }

    return "keep";
}

/**
 * Detect CSV separator (comma or semicolon).
 */
export function detectCsvSeparator(firstLine: string): string {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    return commaCount > semicolonCount ? "," : ";";
}

/**
 * Parse CSV text into rows. Handles quoted fields.
 */
export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const sep = detectCsvSeparator(lines[0]);

    function splitLine(line: string): string[] {
        const fields: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === sep && !inQuotes) {
                fields.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        fields.push(current.trim());
        return fields;
    }

    const headers = splitLine(lines[0]).filter(Boolean);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = splitLine(lines[i]);
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
            row[headers[j]] = values[j] ?? "";
        }
        // Skip footer/junk rows
        const firstVal = (row[headers[0]] ?? "").trim();
        if (
            !firstVal ||
            firstVal === "nan" ||
            firstVal.startsWith("Found profiles count:") ||
            firstVal === "IG DM BOT:" ||
            firstVal.includes("profiles max on free plan") ||
            firstVal.includes("socialdeck.ai")
        ) {
            continue;
        }
        rows.push(row);
    }

    return { headers, rows };
}

const USERNAME_ALIASES = ["user_name", "userName", "username", "login", "User Name"];
const FULLNAME_ALIASES = ["full_name", "fullName", "name"];

function getField(row: Record<string, string>, aliases: string[]): string {
    for (const alias of aliases) {
        const v = row[alias];
        if (v && v.trim()) return v.trim();
    }
    return "";
}

export interface AccountEntry {
    userName: string;
    fullName: string;
}

export interface FilterResult {
    totalProcessed: number;
    removed: number;
    remaining: number;
    accounts: AccountEntry[];
}

/**
 * Filter rows by gender and extract accounts.
 */
export async function filterAndExtract(
    rows: Record<string, string>[],
    keepFields: string[]
): Promise<FilterResult> {
    let removed = 0;
    const accounts: AccountEntry[] = [];
    const seen = new Set<string>();

    const keywordSets = await fetchAllKeywordSets();

    for (const row of rows) {
        const username = getField(row, USERNAME_ALIASES);
        const fullname = getField(row, FULLNAME_ALIASES);

        if (fullname) {
            const eng = await isEnglish(fullname);
            if (!eng) {
                removed++;
                continue;
            }
        }

        // Check against US Male names allow-list
        if (keywordSets.usMaleNames.size > 0) {
            let hasMaleName = false;

            // 1. Check Full Name
            if (fullname) {
                const cleanedFullName = fullname.toLowerCase().replace(/[^a-z]+/g, " ");
                const nameParts = cleanedFullName.split(/\s+/).filter(Boolean);
                for (const part of nameParts) {
                    if (keywordSets.usMaleNames.has(part)) {
                        hasMaleName = true;
                        break;
                    }
                }
            }

            // 2. Fallback: Check Username (e.g. john_smith99 -> 'john', 'smith')
            if (!hasMaleName && username) {
                // Remove numbers, underscores, dots, and convert to lowercase parts
                const cleanedUserName = username.toLowerCase().replace(/[^a-z]+/g, " ");
                const userParts = cleanedUserName.split(/\s+/).filter(Boolean);
                for (const part of userParts) {
                    if (keywordSets.usMaleNames.has(part)) {
                        hasMaleName = true;
                        break;
                    }
                }
            }

            // If we strictly want to keep US males, and neither fullname nor username contain a recognized male name, we skip them.
            if (!hasMaleName) {
                removed++;
                continue;
            }
        }

        if (classifyGender(username, fullname, keywordSets) === "female") {
            removed++;
            continue;
        }

        const clean = username.replace(/^@/, "").trim();
        if (clean && !seen.has(clean.toLowerCase())) {
            seen.add(clean.toLowerCase());
            accounts.push({ userName: clean, fullName: fullname });
        }
    }

    return {
        totalProcessed: rows.length,
        removed,
        remaining: rows.length - removed,
        accounts,
    };
}
