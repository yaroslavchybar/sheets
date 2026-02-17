import { readFileSync } from "fs";
import { join } from "path";

/**
 * Gender classification for Instagram accounts.
 * Ported from Python datauploader/filter_instagram.py
 */

function loadKeywordsFromFile(filename: string): Set<string> {
    try {
        const filePath = join(process.cwd(), "src", "lib", "keywords", filename);
        const content = readFileSync(filePath, "utf-8");
        const words = new Set<string>();
        for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                words.add(trimmed.toLowerCase());
            }
        }
        return words;
    } catch {
        console.warn(`Warning: keyword file '${filename}' not found.`);
        return new Set();
    }
}

// Lazy-loaded keyword sets
let _maleNamesExceptions: Set<string> | null = null;
let _femaleBusinessKeywords: Set<string> | null = null;
let _femaleNames: Set<string> | null = null;

function getMaleNamesExceptions(): Set<string> {
    if (!_maleNamesExceptions) {
        _maleNamesExceptions = loadKeywordsFromFile("males_names.txt");
    }
    return _maleNamesExceptions;
}

function getFemaleBusinessKeywords(): Set<string> {
    if (!_femaleBusinessKeywords) {
        _femaleBusinessKeywords = loadKeywordsFromFile("female_business_keywords.txt");
    }
    return _femaleBusinessKeywords;
}

function getFemaleNames(): Set<string> {
    if (!_femaleNames) {
        _femaleNames = new Set([
            ...loadKeywordsFromFile("ukrainian_female_names.txt"),
            ...loadKeywordsFromFile("russian_female_names.txt"),
        ]);
    }
    return _femaleNames;
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
export function classifyGender(username: string, fullname: string): "female" | "keep" {
    const combinedText = `${username} ${fullname}`.toLowerCase();
    if (!combinedText.trim()) return "keep";

    const normalizedText = normalizeText(combinedText);
    const cleanedText = normalizedText.replace(/[^a-zа-яёїієґ]+/g, " ");
    const parts = new Set(cleanedText.split(/\s+/).filter(Boolean));

    const femaleBusinessKw = getFemaleBusinessKeywords();
    for (const keyword of femaleBusinessKw) {
        if (parts.has(keyword)) return "female";
    }

    const maleExceptions = getMaleNamesExceptions();
    for (const maleName of maleExceptions) {
        if (parts.has(maleName)) return "keep";
    }

    const femNames = getFemaleNames();
    for (const femaleName of femNames) {
        if (parts.has(femaleName)) return "female";
    }

    // Last resort: check female endings
    for (const part of parts) {
        if (part.length > 3 && !maleExceptions.has(part)) {
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
export function filterAndExtract(
    rows: Record<string, string>[],
    keepFields: string[]
): FilterResult {
    let removed = 0;
    const accounts: AccountEntry[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
        const username = getField(row, USERNAME_ALIASES);
        const fullname = getField(row, FULLNAME_ALIASES);

        if (classifyGender(username, fullname) === "female") {
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
