"use client";

import type { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SheetTable } from "@/components/sheet-table";
import { UserNav } from "@/components/user-nav";
import { Sheet } from "lucide-react";
import { getUsers } from "@/services/google-sheets";
import { useEffect, useState } from "react";
import type { User as AppUser } from "@/lib/types";

export default function Dashboard({ user }: { user: User }) {
  const [appUser, setAppUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const fetchAppUser = async () => {
      if (user.email) {
        const sheetUsers = await getUsers();
        const foundUser = sheetUsers.find(u => u.email.toLowerCase() === user.email!.toLowerCase());
        if (foundUser) {
          setAppUser(foundUser);
        } else {
          // Fallback for user not in sheet
          setAppUser({
            email: user.email,
            name: user.email.split('@')[0],
            avatar: user.user_metadata.avatar_url || `https://placehold.co/40x40/E9ECEF/212529/png?text=${user.email.charAt(0).toUpperCase()}`,
            role: 'member'
          });
        }
      }
    };
    fetchAppUser();
  }, [user]);

  if (!user || !appUser) return null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Sheet className="h-6 w-6" />
          <span>SheetFlow</span>
        </div>
        <div className="ml-auto">
          <UserNav user={user} appUser={appUser} />
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
            <SheetTable user={appUser} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
