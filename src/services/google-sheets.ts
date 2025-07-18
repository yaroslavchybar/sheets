'use server';
// IMPORTANT: This file is a placeholder for Google Sheets integration.
// It currently uses mock data. To enable real Google Sheets integration,
// you must set up a Google Cloud project, enable the Sheets API, create
// a service account, and set the required environment variables in a .env.local file.
//
// Required environment variables:
// GOOGLE_SHEET_ID=your-google-sheet-id

import type { Task, User } from '@/lib/types';
import { sheetUsers, sheetData } from '@/data/sheet-data';
import { google } from 'googleapis';
import credentials from '../../credentials.json';

// A flag to easily switch between mock data and live data.
// In a real app, you might remove this and rely solely on the environment variables.
const useMockData = !process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID;

const getGoogleSheetsClient = () => {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
  const jwt = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes
  });
  return google.sheets({ version: 'v4', auth: jwt });
};


export async function getUsers(): Promise<User[]> {
  if (useMockData) {
    console.log("Using mock user data. Set NEXT_PUBLIC_GOOGLE_SHEET_ID to connect to Google Sheets.");
    return Promise.resolve(sheetUsers);
  }

  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID,
      range: 'Users!A2:D', // Assumes Users sheet with columns: Name, Email, Avatar, Role
    });

    const rows = response.data.values;
    if (rows && rows.length) {
      return rows.map((row): User => ({
        name: row[0],
        email: row[1],
        avatar: row[2],
        role: row[3] as 'admin' | 'member',
      }));
    }
  } catch (err) {
    console.error('Error fetching users from Google Sheets:', err);
    // Fallback to mock data or return empty array on error
  }

  return [];
}

export async function getTasks(): Promise<Task[]> {
   if (useMockData) {
    console.log("Using mock task data. Set NEXT_PUBLIC_GOOGLE_SHEET_ID to connect to Google Sheets.");
    return Promise.resolve(sheetData);
  }

  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID,
      range: 'Tasks!A2:E', // Assumes Tasks sheet with columns: ID, Task, Assignee Name, Status, Due Date
    });

    const rows = response.data.values;
    if (rows && rows.length) {
      // This is a bit simplified; real implementation would need to look up assignee avatar.
      // For now, we'll use a placeholder.
      const users = await getUsers();
      const userMap = new Map(users.map(u => [u.name, u]));

      return rows.map((row): Task => {
        const assigneeName = row[2];
        const assigneeAvatar = userMap.get(assigneeName)?.avatar || `https://placehold.co/32x32/E9ECEF/212529/png?text=${assigneeName.charAt(0)}`;

        return {
          id: row[0],
          task: row[1],
          assignee: {
            name: assigneeName,
            avatar: assigneeAvatar,
          },
          status: row[3] as 'To Do' | 'In Progress' | 'Done',
          dueDate: row[4],
        };
      });
    }
  } catch (err) {
    console.error('Error fetching tasks from Google Sheets:', err);
  }

  return [];
}
