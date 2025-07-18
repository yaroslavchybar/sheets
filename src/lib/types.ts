export type Task = {
  id: string;
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
