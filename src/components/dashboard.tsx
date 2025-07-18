'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SheetTable } from '@/components/sheet-table';
import { Sheet } from 'lucide-react';
import type { User, AppUser } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getUsers } from '@/services/google-sheets';
import { UserNav } from '@/components/user-nav';

export default function Dashboard({ user }: { user: AppUser }) {
  const [tasksUser, setTasksUser] = useState<User | null>(null);

  useEffect(() => {
    const findUserInSheet = async () => {
      const sheetUsers = await getUsers(user.email);
      const foundUser = sheetUsers.find(
        (u) => u.email.toLowerCase() === user.email?.toLowerCase()
      );

      if (foundUser) {
        setTasksUser(foundUser);
      } else {
        setTasksUser({
          email: user.email || '',
          name: user.username || user.email.split('@')[0],
          avatar: user.photoUrl,
          role: 'member', 
        });
      }
    };
    findUserInSheet();
  }, [user]);

  if (!tasksUser) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Sheet className="h-6 w-6" />
          <span>SheetFlow</span>
        </div>
        <div className="ml-auto">
          <UserNav user={user} />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Project Tasks</CardTitle>
            <CardDescription>
              An interactive list of tasks from your connected Google Sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SheetTable user={tasksUser} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
