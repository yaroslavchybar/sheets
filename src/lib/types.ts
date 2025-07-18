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

// Represents the user object for our app's session
export type AppUser = {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl: string;
};
