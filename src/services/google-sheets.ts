
'use server';

import type { Task, User } from '@/lib/types';
import { sheetUsers, sheetData } from '@/data/sheet-data';
import { google } from 'googleapis';
import credentials from '../../credentials.json';

const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const useMockData = !GOOGLE_SHEET_ID;

const getGoogleSheetsClient = () => {
  const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
  const jwt = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes
  });
  return google.sheets({ version: 'v4', auth: jwt });
};

export async function getUsers(currentUserEmail?: string | null): Promise<User[]> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

  if (useMockData) {
    console.log("Using mock user data. Set GOOGLE_SHEET_ID in .env.local to connect to Google Sheets.");
    const mockUsers = sheetUsers.map(user => ({
      ...user,
      role: adminEmails.includes(user.email.toLowerCase()) ? 'admin' : 'member'
    }));

    if (currentUserEmail) {
      const email = currentUserEmail.toLowerCase();
      const userExists = mockUsers.some(u => u.email.toLowerCase() === email);
      if (!userExists) {
        const name = email.split('@')[0];
        const initial = name.charAt(0).toUpperCase();
        mockUsers.push({
          email: email,
          role: adminEmails.includes(email) ? 'admin' : 'member',
          name: name.charAt(0).toUpperCase() + name.slice(1),
          avatar: `https://placehold.co/40x40/E9ECEF/212529/png?text=${initial}`,
        });
      }
    }
    return mockUsers;
  }

  let usersFromSheet: User[] = [];
  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'users!A:A',
    });

    const rows = response.data.values;
    if (rows && rows.length > 1) {
      usersFromSheet = rows.slice(1).filter(row => row[0]).map((row): User => {
        const email = row[0].toLowerCase();
        const name = email.split('@')[0];
        const initial = name.charAt(0).toUpperCase();

        return {
            email: email,
            role: adminEmails.includes(email) ? 'admin' : 'member',
            name: name.charAt(0).toUpperCase() + name.slice(1),
            avatar: `https://placehold.co/40x40/E9ECEF/212529/png?text=${initial}`,
        };
      });
    }
  } catch (err) {
    console.error('Error fetching users from Google Sheets:', err);
    // Fallback to an empty array in case of error
    usersFromSheet = [];
  }

  // Ensure the current user is always in the list, even if not in the sheet
  if (currentUserEmail) {
      const email = currentUserEmail.toLowerCase();
      const userExists = usersFromSheet.some(u => u.email.toLowerCase() === email);
      if (!userExists) {
          const name = email.split('@')[0];
          const initial = name.charAt(0).toUpperCase();
          usersFromSheet.push({
              email: email,
              role: adminEmails.includes(email) ? 'admin' : 'member',
              name: name.charAt(0).toUpperCase() + name.slice(1),
              avatar: `https://placehold.co/40x40/E9ECEF/212529/png?text=${initial}`,
          });
      }
  }

  return usersFromSheet;
}

export async function getTasks(): Promise<Task[]> {
   if (useMockData) {
    console.log("Using mock task data. Set GOOGLE_SHEET_ID in .env.local to connect to Google Sheets.");
    return Promise.resolve(sheetData.map((t, i) => ({...t, rowNumber: i+2})));
  }

  try {
    const sheets = getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'damp_data!A2:E', 
    });

    const rows = response.data.values;
    if (rows && rows.length) {
      const users = await getUsers();
      const userMap = new Map(users.map(u => [u.name, u]));

      return rows.map((row, index): Task => {
        const assigneeName = row[2];
        const assigneeAvatar = userMap.get(assigneeName)?.avatar || `https://placehold.co/32x32/E9ECEF/212529/png?text=${assigneeName ? assigneeName.charAt(0).toUpperCase() : ''}`;

        return {
          id: row[0],
          rowNumber: index + 2, // Assuming data starts at row 2
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

export async function updateTaskStatus(rowNumber: number, status: Task['status']): Promise<boolean> {
  if (useMockData) {
    console.log(`Mock update: Task in row ${rowNumber} status to ${status}.`);
    // Find the task and update it in the mock data source
    const taskIndex = sheetData.findIndex(t => (t as any).rowNumber === rowNumber);
    if(taskIndex !== -1) {
      sheetData[taskIndex].status = status;
    }
    return true;
  }

  try {
    const sheets = getGoogleSheetsClient();
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `damp_data!D${rowNumber}`, // Column D for Status
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[status]],
      },
    });
    return true;
  } catch (err) {
    console.error('Error updating task status in Google Sheets:', err);
    return false;
  }
}
