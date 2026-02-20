'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, UploadCloud, FileText, LayoutDashboard, Menu } from 'lucide-react';
import { useSession } from '@/hooks/use-session';
import { UserNav } from '@/components/user-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import type { AppUser } from '@/lib/types';

const navItems = [
    { name: 'Обзор & Пользователи', href: '/admin/users', icon: Users },
    { name: 'Загрузка Базы', href: '/admin/import', icon: UploadCloud },
    { name: 'Словари & Ключи', href: '/admin/keywords', icon: FileText },
];

export function MobileSidebar() {
    const pathname = usePathname();
    const { user: session } = useSession();
    const [open, setOpen] = useState(false);

    let pageUser: AppUser | null = null;
    if (session) {
        pageUser = {
            id: session.id,
            email: session.email,
            username: session.email.split('@')[0],
            photoUrl: `https://placehold.co/40x40/212529/F8F9FA/png?text=${session.email.charAt(0).toUpperCase()}`,
            role: session.role || 'admin',
        };
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle Sidebar</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85%] sm:w-[350px] p-0 flex flex-col pt-12">
                <SheetHeader className="px-6 text-left absolute top-4">
                    <SheetTitle className="flex items-center gap-2">
                        <LayoutDashboard className="h-5 w-5 text-primary" />
                        <span>Admin Shell</span>
                    </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto mt-6">
                    <nav className="space-y-2 px-4">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-all duration-200 group',
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            'h-5 w-5 transition-transform group-hover:scale-110',
                                            isActive ? 'text-primary-foreground' : 'opacity-70 group-hover:opacity-100'
                                        )}
                                    />
                                    {item.name}
                                    {isActive && (
                                        <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-md" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                <div className="mt-auto border-t bg-muted/20 p-4">
                    {pageUser && (
                        <UserNav
                            user={pageUser}
                            customTrigger={
                                <button className="flex items-center gap-3 w-full rounded-xl border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors text-left outline-none">
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={pageUser.photoUrl} alt={`@${pageUser.username}`} />
                                        <AvatarFallback>{(pageUser.username || "A").charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0 overflow-hidden">
                                        <span className="text-base font-medium truncate text-foreground/90">{pageUser.username}</span>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider truncate">{pageUser.role}</span>
                                    </div>
                                </button>
                            }
                        />
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
