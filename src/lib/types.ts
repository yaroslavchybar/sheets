
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

export type UserRole = 'admin' | 'member';

// Represents the user object for our app's session
export type AppUser = {
  id: string;
  email: string;
  username?: string;
  photoUrl: string;
  role?: UserRole;
};

// Represents an Instagram account from the database
export type InstagramAccount = {
  id: string;
  userName: string;
  fullName: string;
  profileUrl: string;
  status: 'available' | 'assigned' | 'sent' | 'skip';
};

// Represents application settings
export type AppSettings = {
  daily_assignments_per_member: number;
};

// Represents a user with their role and settings for the admin page
export type UserWithRole = {
  id: string;
  email: string;
  role: UserRole;
  daily_assignments_limit: number;
  sent_today_count: number;
  sent_total_count: number;
}
