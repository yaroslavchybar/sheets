'use client';

import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { KeywordsTabContent } from '../users/_components/keywords-tab-content';

export default function AdminKeywordsPage() {
    const { user: session, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!session || session.role !== 'admin')) {
            router.push('/');
        }
    }, [isLoading, session, router]);

    if (isLoading || !session) {
        return (
            <div className="space-y-4 w-full">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <KeywordsTabContent />
        </div>
    );
}
