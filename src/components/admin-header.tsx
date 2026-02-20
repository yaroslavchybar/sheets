'use client';

import { useSession } from '@/hooks/use-session';
import { UserNav } from '@/components/user-nav';
import { BarChart3 } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminHeader() {
    const { user: session, isLoading } = useSession();

    const pageUser: AppUser | null = session ? {
        id: session.id,
        email: session.email,
        username: session.email.split('@')[0],
        photoUrl: `https://placehold.co/40x40/212529/F8F9FA/png?text=${session.email.charAt(0).toUpperCase()}`,
        role: session.role as AppUser['role'],
    } : null;

    return (
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
            <div className="flex h-14 items-center gap-4 px-4 md:px-8 max-w-7xl mx-auto w-full">
                <Link href="/admin/users" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <BarChart3 className="h-4 w-4" />
                    </div>
                    <span className="font-semibold tracking-tight hidden sm:block">Система Управления</span>
                </Link>
                <div className="ml-auto">
                    {isLoading ? (
                        <Skeleton className="h-8 w-8 rounded-full" />
                    ) : pageUser ? (
                        <UserNav user={pageUser} />
                    ) : null}
                </div>
            </div>
        </header>
    );
}
