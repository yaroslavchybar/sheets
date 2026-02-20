import { readFileSync } from 'fs';
import { join } from 'path';
import { ConvexHttpClient } from 'convex/browser';
import * as dotenv from 'dotenv';
import { api } from '../convex/_generated/api.js';

dotenv.config({ path: '.env.local' });

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || '');

const ALLOWED_FILES = [
    'female_business_keywords.txt',
    'males_names.txt',
    'ukrainian_female_names.txt',
    'russian_female_names.txt',
];

async function migrate() {
    console.log('Starting migration...');
    for (const filename of ALLOWED_FILES) {
        try {
            const filePath = join(process.cwd(), 'src', 'lib', 'keywords', filename);
            const content = readFileSync(filePath, 'utf-8');
            await client.mutation(api.keywords.save, {
                filename,
                content,
            });
            console.log(`Migrated ${filename}`);
        } catch (error) {
            console.error(`Error migrating ${filename}:`, error);
        }
    }
    console.log('Migration complete!');
}

migrate().catch(console.error);
