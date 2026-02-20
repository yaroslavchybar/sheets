'use client';

import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { UploadTabContent } from '../users/_components/upload-tab-content';

export default function AdminImportPage() {
    const { user: session, isLoading, token } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && (!session || session.role !== 'admin')) {
            router.push('/');
        }
    }, [isLoading, session, router]);

    if (isLoading || !session || !token) {
        return (
            <div className="space-y-4 w-full">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Загрузка Базы</h1>
                <p className="text-muted-foreground mt-2">
                    Импортируйте новые аккаунты из CSV файлов. Система автоматически отфильтрует женские профили.
                </p>
            </div>
            <UploadTabContent token={token} />
        </div>
    );
}
