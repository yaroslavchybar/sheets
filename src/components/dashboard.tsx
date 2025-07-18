'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SheetTable } from '@/components/sheet-table';
import { Sheet } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getUsers } from '@/services/google-sheets';
import { UserButton, useUser } from '@clerk/nextjs';

export default function Dashboard() {
  const { user: clerkUser } = useUser();
  const [tasksUser, setTasksUser] = useState<any | null>(null);

  useEffect(() => {
    const findUserInSheet = async () => {
      if (!clerkUser) return;
      const currentUserEmail = clerkUser.primaryEmailAddress?.emailAddress;

      const sheetUsers = await getUsers(currentUserEmail);
      const foundUser = sheetUsers.find(
        (u) => u.email.toLowerCase() === currentUserEmail?.toLowerCase()
      );

      if (foundUser) {
        setTasksUser(foundUser);
      } else {
        // Fallback for user not in sheet
        const name = clerkUser.username || clerkUser.firstName || 'User';
        const initial = name.charAt(0).toUpperCase();
        setTasksUser({
          email: currentUserEmail,
          name: name,
          avatar: `https://placehold.co/40x40/E9ECEF/212529/png?text=${initial}`,
          role: 'member',
        });
      }
    };
    findUserInSheet();
  }, [clerkUser]);

  if (!tasksUser || !clerkUser) {
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
          <UserButton afterSignOutUrl="/"/>
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
