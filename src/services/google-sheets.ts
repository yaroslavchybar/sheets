// IMPORTANT: This file is a placeholder for Google Sheets integration.
// It currently uses mock data. To enable real Google Sheets integration,
// you must set up a Google Cloud project, enable the Sheets API, create
// a service account, and set the required environment variables in a .env.local file.
//
// Required environment variables:
// GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
// GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n
// GOOGLE_SHEET_ID=your-google-sheet-id

import type { Task, User } from '@/lib/types';
import { sheetUsers, sheetData } from '@/data/sheet-data';

// A flag to easily switch between mock data and live data.
// In a real app, you might remove this and rely solely on the environment variables.
const useMockData = !process.env.GOOGLE_SHEET_ID;

export async function getUsers(): Promise<User[]> {
  if (useMockData) {
    console.log("Using mock user data. Set GOOGLE_SHEET_ID to connect to Google Sheets.");
    return Promise.resolve(sheetUsers);
  }

  // TODO: Implement Google Sheets API call to fetch users
  // For now, it returns mock data if the API call is not implemented.
  return Promise.resolve(sheetUsers);
}

export async function getTasks(): Promise<Task[]> {
  if (useMockData) {
    console.log("Using mock task data. Set GOOGLE_SHEET_ID to connect to Google Sheets.");
    return Promise.resolve(sheetData);
  }
  
  // TODO: Implement Google Sheets API call to fetch tasks
  // For now, it returns mock data if the API call is not implemented.
  return Promise.resolve(sheetData);
}
