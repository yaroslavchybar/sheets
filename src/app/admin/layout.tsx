import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin-sidebar';
import { MobileSidebar } from '@/components/mobile-sidebar';
import { LayoutDashboard } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-full flex-col bg-background/50 overflow-hidden">
            {/* Mobile Header Bar */}
            <div className="md:hidden flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <LayoutDashboard className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg tracking-tight">Admin Shell</span>
                </div>
                <MobileSidebar />
            </div>

            <div className="flex flex-1 w-full overflow-hidden">
                <AdminSidebar />
                <main className="flex-1 w-full overflow-y-auto px-4 py-6 md:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
