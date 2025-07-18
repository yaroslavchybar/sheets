'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SheetTable } from '@/components/sheet-table';
import { UserNav } from '@/components/user-nav';
import { Sheet } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getUsers } from '@/services/google-sheets';

export default function Dashboard({ user }: { user: AppUser }) {
  const [tasksUser, setTasksUser] = useState<any | null>(null);

  useEffect(() => {
    const findUserInSheet = async () => {
      // In a real app, you might map telegram username to an email or other identifier
      // For this demo, we'll just use a fallback if the telegram user isn't in our sheet.
      const sheetUsers = await getUsers();
      const foundUser = sheetUsers.find(
        (u) => u.name.toLowerCase() === user.username?.toLowerCase()
      );

      if (foundUser) {
        setTasksUser(foundUser);
      } else {
        // Fallback for user not in sheet, using their telegram profile
        setTasksUser({
          email: `${user.username}@telegram.user`,
          name: user.username || user.firstName,
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
          <UserNav user={user} appUser={tasksUser} />
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
