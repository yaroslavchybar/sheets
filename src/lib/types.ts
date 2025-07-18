export type Task = {
  id: string;
  rowNumber?: number; // To track the row in Google Sheets for updates
  task: string;
  assignee: {
    name: string;
    avatar: string;
  };
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate: string;
};

// Represents a user from the Google Sheet
export type User = {
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member';
};

// Represents the user data from Telegram widget
export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url: string;
  auth_date: number;
  hash: string;
};

// Represents the user object for our app's session
export type AppUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl: string;
};
