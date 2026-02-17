'use client';

import Dashboard from '@/components/dashboard';
import type { AppUser } from '@/lib/types';
import { useSession, clearSessionToken } from '@/hooks/use-session';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user: session, isLoading, token } = useSession();
  const router = useRouter();

  const tasks = useQuery(
    api.instagramAccounts.getDailyTasks,
    token ? { sessionToken: token } : "skip"
  );

  useEffect(() => {
    if (!isLoading && !session) {
      clearSessionToken();
      router.push('/login');
    }
  }, [isLoading, session, router]);

  useEffect(() => {
    if (session?.role === 'admin') {
      router.push('/admin/users');
    }
  }, [session, router]);

  if (isLoading || !session || tasks === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 w-full max-w-2xl p-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (session.role === 'admin') {
    return null; // Will redirect
  }

  const appUser: AppUser = {
    id: session.id,
    email: session.email,
    username: session.email.split('@')[0],
    photoUrl: `https://placehold.co/40x40/212529/F8F9FA/png?text=${session.email.charAt(0).toUpperCase()}`,
    role: session.role as AppUser['role'],
  };

  const dailyTasks = (tasks ?? []).map((t: any) => ({
    id: t.id,
    userName: t.userName,
    fullName: t.fullName,
    profileUrl: t.profileUrl,
    status: t.status as 'assigned',
  }));

  const sentTodayCount = session.sentToday ?? 0;

  return <Dashboard user={appUser} tasks={dailyTasks} sentTodayCount={sentTodayCount} />;
}
