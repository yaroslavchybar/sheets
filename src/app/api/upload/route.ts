import { NextRequest, NextResponse } from "next/server";
import { parseCsv, filterAndExtract } from "@/lib/genderFilter";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const action = formData.get("action") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const text = await file.text();
        const { headers, rows } = parseCsv(text);

        if (headers.length === 0) {
            return NextResponse.json({ error: "Empty or invalid CSV" }, { status: 400 });
        }

        // Preview: return fields, sample row, row count
        if (action === "preview") {
            const sampleRow: Record<string, string> = {};
            if (rows.length > 0) {
                for (const h of headers) {
                    sampleRow[h] = rows[0][h] ?? "";
                }
            }
            return NextResponse.json({
                fields: headers,
                sampleRow,
                rowCount: rows.length,
            });
        }

        // Process: filter and return usernames
        if (action === "process") {
            const keepFieldsRaw = formData.get("keepFields") as string | null;
            const keepFields = keepFieldsRaw ? JSON.parse(keepFieldsRaw) as string[] : headers;

            const result = filterAndExtract(rows, keepFields);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid action. Use 'preview' or 'process'" }, { status: 400 });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
    }
}
