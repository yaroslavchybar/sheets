'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SheetTable } from '@/components/sheet-table';
import { UserRoundCheck } from 'lucide-react';
import type { AppUser, InstagramAccount } from '@/lib/types';
import { UserNav } from '@/components/user-nav';

interface DashboardProps {
  user: AppUser;
  tasks: InstagramAccount[];
  sentTodayCount: number;
}

export default function Dashboard({ user, tasks, sentTodayCount }: DashboardProps) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <UserRoundCheck className="h-6 w-6" />
          <span>F/U</span>
        </div>
        <div className="ml-auto">
          <UserNav user={user} />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="hidden sm:block">
                <CardTitle>Ежедневные аккаунты Instagram</CardTitle>
                <CardDescription>
                  Ваш список аккаунтов для отправки DM на сегодня.
                </CardDescription>
              </div>
              <div className="text-sm font-medium text-muted-foreground sm:text-right">
                <p>Отправлено DM сегодня</p>
                <p className="text-2xl font-bold text-foreground">{sentTodayCount}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {user.role === 'member' ? (
              <SheetTable tasks={tasks} />
            ) : (
              <div className="text-center text-muted-foreground">
                Добро пожаловать, админ! У вас нет ежедневных задач.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
