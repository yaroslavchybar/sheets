import type { Task, User } from '@/lib/types';

export const sheetUsers: User[] = [
  {
    name: 'Admin User',
    email: 'admin@sheetflow.app',
    avatar: 'https://placehold.co/40x40/212529/F8F9FA/png?text=AU',
    role: 'admin',
  },
  {
      name: 'Alice',
      email: 'alice@sheetflow.app',
      avatar: 'https://placehold.co/40x40/E9ECEF/212529/png?text=A',
      role: 'member',
  },
  {
      name: 'Bob',
      email: 'bob@sheetflow.app',
      avatar: 'https://placehold.co/40x40/E9ECEF/212529/png?text=B',
      role: 'member',
  },
    {
      name: 'Charlie',
      email: 'charlie@sheetflow.app',
      avatar: 'https://placehold.co/40x40/E9ECEF/212529/png?text=C',
      role: 'member',
  },
  {
      name: 'David',
      email: 'david@sheetflow.app',
      avatar: 'https://placehold.co/40x40/E9ECEF/212529/png?text=D',
      role: 'member',
  },
    {
      name: 'Eve',
      email: 'eve@sheetflow.app',
      avatar: 'https://placehold.co/40x40/E9ECEF/212529/png?text=E',
      role: 'member',
  }
];

export const sheetData: Task[] = [
  {
    id: 'TSK-001',
    task: 'Design the new landing page',
    assignee: { name: 'Alice', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=A' },
    status: 'In Progress',
    dueDate: '2024-08-15',
  },
  {
    id: 'TSK-002',
    task: 'Develop the authentication flow',
    assignee: { name: 'Bob', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=B' },
    status: 'Done',
    dueDate: '2024-08-10',
  },
  {
    id: 'TSK-003',
    task: 'Setup the database schema',
    assignee: { name: 'Charlie', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=C' },
    status: 'To Do',
    dueDate: '2024-08-20',
  },
  {
    id: 'TSK-004',
    task: 'Write API documentation',
    assignee: { name: 'Alice', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=A' },
    status: 'To Do',
    dueDate: '2024-08-25',
  },
  {
    id: 'TSK-005',
    task: 'Implement the data table component',
    assignee: { name: 'David', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=D' },
    status: 'In Progress',
    dueDate: '2024-08-18',
  },
  {
    id: 'TSK-006',
    task: 'Deploy staging environment',
    assignee: { name: 'Charlie', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=C' },
    status: 'Done',
    dueDate: '2024-08-12',
  },
  {
    id: 'TSK-007',
    task: 'User acceptance testing',
    assignee: { name: 'Eve', avatar: 'https://placehold.co/32x32/E9ECEF/212529/png?text=E' },
    status: 'To Do',
    dueDate: '2024-09-01',
  },
];
