'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SheetTable } from '@/components/sheet-table';
import { Sheet } from 'lucide-react';
import type { User, AppUser } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getUsers } from '@/services/google-sheets';
import { UserNav } from '@/components/user-nav';

export default function Dashboard({ user: appUser }: { user: AppUser }) {
  const [tasksUser, setTasksUser] = useState<User | null>(null);

  useEffect(() => {
    const findUserInSheet = async () => {
      // Pass the current user's email to ensure they are included in the results
      const sheetUsers = await getUsers(appUser.email);
      const foundUser = sheetUsers.find(
        (u) => u.email.toLowerCase() === appUser.email?.toLowerCase()
      );

      if (foundUser) {
        setTasksUser(foundUser);
      } else {
        // This fallback may not be strictly necessary anymore but is good for safety.
        setTasksUser({
          email: appUser.email || '',
          name: appUser.username || appUser.email.split('@')[0],
          avatar: appUser.photoUrl,
          role: 'member', // Default to member if not found in sheet
        });
      }
    };
    findUserInSheet();
  }, [appUser]);

  if (!tasksUser) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center">
        <p>Loading user data...</p>
      </div>
    );
  }
  
  const pageUser = {
    id: appUser.id,
    email: appUser.email!,
    username: appUser.username,
    photoUrl: appUser.photoUrl,
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Sheet className="h-6 w-6" />
          <span>SheetFlow</span>
        </div>
        <div className="ml-auto">
          <UserNav user={pageUser} />
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
