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

export type User = {
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member';
};
