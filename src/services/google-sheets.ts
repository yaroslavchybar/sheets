'use server';

import { google } from 'googleapis';
import type { InstagramAccount } from '@/lib/types';
import credentials from '../../credentials.json';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'need_sub';

// Ensure the structure of your credentials matches this type
interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

const serviceAccount = credentials as ServiceAccountCredentials;

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Fetches all available accounts from the "need_sub" sheet.
 * Assumes that any row present is an available task.
 */
export async function getAvailableAccounts(): Promise<InstagramAccount[]> {
  if (!SPREADSHEET_ID) {
    throw new Error('Google Sheet ID is not configured in environment variables.');
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A2:E`, // Read from the second row to the end
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }
    
    // Map rows to InstagramAccount objects
    const accounts: InstagramAccount[] = rows.map((row, index) => ({
      rowNumber: index + 2, // Sheet rows are 1-based, and we start from A2
      id: row[0] || '', // Column A: ID
      userName: row[1] || '', // Column B: userName
      fullName: row[2] || '', // Column C: fullName
      profileUrl: row[3] || '', // Column D: profileUrl
      isSubscribed: row[4] === 'TRUE', // Column E: Подписался
    }));
    
    return accounts;
  } catch (err) {
    console.error('Error fetching data from Google Sheets:', err);
    return [];
  }
}

/**
 * Updates the "Подписался" checkbox for a specific row in the sheet.
 * @param rowNumber The row number to update.
 * @param subscribed The new boolean value for the checkbox.
 */
export async function updateSubscriptionStatus(rowNumber: number, subscribed: boolean): Promise<boolean> {
  if (!SPREADSHEET_ID) {
    throw new Error('Google Sheet ID is not configured in environment variables.');
  }

  try {
    const range = `${SHEET_NAME}!E${rowNumber}`; // Target the checkbox column (E)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[subscribed ? 'TRUE' : 'FALSE']],
      },
    });
    return true;
  } catch (err) {
    console.error('Error updating Google Sheet:', err);
    return false;
  }
}
