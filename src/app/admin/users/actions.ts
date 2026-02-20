'use server';

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ALLOWED_FILES = [
    'female_business_keywords.txt',
    'males_names.txt',
    'ukrainian_female_names.txt',
    'russian_female_names.txt',
];

export async function getKeywords(filename: string): Promise<string> {
    if (!ALLOWED_FILES.includes(filename)) {
        throw new Error('Invalid filename');
    }

    try {
        const filePath = join(process.cwd(), 'src', 'lib', 'keywords', filename);
        const content = readFileSync(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error(`Error reading ${filename}:`, error);
        throw new Error('Failed to read keywords file');
    }
}

export async function saveKeywords(filename: string, content: string): Promise<{ success: boolean; error?: string }> {
    if (!ALLOWED_FILES.includes(filename)) {
        return { success: false, error: 'Invalid filename' };
    }

    try {
        const filePath = join(process.cwd(), 'src', 'lib', 'keywords', filename);
        writeFileSync(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        console.error(`Error writing ${filename}:`, error);
        return { success: false, error: 'Failed to save keywords file' };
    }
}
