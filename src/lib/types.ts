export type Task = {
  id: string;
  rowNumber?: number;
  task: string;
  assignee: {
    name: string;
    avatar: string;
    email: string;
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
  id: string;
  email: string;
  username?: string;
  photoUrl: string;
  role?: 'admin' | 'member' | 'editor' | 'moderator';
};

// Represents an Instagram account from the Google Sheet
export type InstagramAccount = {
  rowNumber: number;
  assignmentId: number; // The ID from the daily_assignments table
  id: string;
  userName: string;
  fullName: string;
  profileUrl: string;
  isSubscribed: boolean;
  isDeleted: boolean;
};

// Represents application settings
export type AppSettings = {
  daily_assignments_per_member: number;
};

// Represents a user with their role and settings for the admin page
export type UserWithRole = {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'editor' | 'moderator';
  daily_assignments_limit: number;
  subscribed_today_count: number;
}
