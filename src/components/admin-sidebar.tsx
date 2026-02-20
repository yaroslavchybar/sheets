'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Users, UploadCloud, FileText, LayoutDashboard, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '@/hooks/use-session';
import { UserNav } from '@/components/user-nav';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { AppUser } from '@/lib/types';

const navItems = [
    { name: 'Обзор & Пользователи', href: '/admin/users', icon: Users },
    { name: 'Загрузка Базы', href: '/admin/import', icon: UploadCloud },
    { name: 'Словари & Ключи', href: '/admin/keywords', icon: FileText },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { user: session } = useSession();

    // Core collapsing state
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const stored = localStorage.getItem('adminSidebarCollapsed');
        if (stored !== null) {
            setIsCollapsed(stored === 'true');
        }
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('adminSidebarCollapsed', String(next));
            return next;
        });
    };

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

    // Prevents hydration mismatch on width
    if (!isMounted) return <aside className="w-64 border-r bg-muted/20 hidden md:flex flex-col h-full z-10 p-4 shrink-0" />;

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    "border-r bg-muted/20 hidden md:flex flex-col h-full z-10 transition-all duration-300 ease-in-out relative shrink-0",
                    isCollapsed ? "w-20 p-3" : "w-64 p-4"
                )}
            >
                {/* Collapse Toggle */}
                <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleCollapse}
                    className="absolute -right-4 top-6 h-8 w-8 rounded-full shadow-md z-20 border-muted bg-background hidden md:flex"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>

                <div className={cn("flex items-center gap-2 mb-8", isCollapsed ? "justify-center px-0" : "px-2")}>
                    <LayoutDashboard className="h-6 w-6 text-primary shrink-0" />
                    {!isCollapsed && <h2 className="text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden">Admin Shell</h2>}
                </div>

                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        const linkContent = (
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center rounded-lg text-sm font-medium transition-all duration-200 group relative',
                                    isCollapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        'transition-transform shrink-0',
                                        isCollapsed ? 'h-5 w-5' : 'h-4 w-4 group-hover:scale-110',
                                        isActive ? 'text-primary-foreground' : 'opacity-70 group-hover:opacity-100'
                                    )}
                                />
                                {!isCollapsed && <span className="whitespace-nowrap overflow-hidden">{item.name}</span>}
                                {isActive && !isCollapsed && (
                                    <div className="absolute left-0 w-1 h-6 rounded-r-md bg-primary" />
                                )}
                            </Link>
                        );

                        return isCollapsed ? (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    {linkContent}
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-medium">
                                    {item.name}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <div key={item.href}>{linkContent}</div>
                        );
                    })}
                </nav>

                <div className={cn("mt-auto py-4 transition-all duration-300", isCollapsed ? "px-0 flex justify-center" : "px-2")}>
                    {pageUser && (
                        isCollapsed ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div>
                                        <UserNav
                                            user={pageUser}
                                            customTrigger={
                                                <button className="flex items-center justify-center w-full rounded-xl border bg-card p-2 shadow-sm hover:border-primary/30 outline-none">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={pageUser.photoUrl} alt={`@${pageUser.username}`} />
                                                        <AvatarFallback>{(pageUser.username || "A").charAt(0).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                </button>
                                            }
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="font-semibold">{pageUser.username}</p>
                                    <p className="text-xs text-muted-foreground uppercase">{pageUser.role}</p>
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <UserNav
                                user={pageUser}
                                customTrigger={
                                    <button className="flex items-center gap-3 w-full rounded-xl border bg-card p-3 shadow-sm hover:border-primary/30 transition-colors text-left outline-none focus-visible:ring-1 focus-visible:ring-primary">
                                        <Avatar className="h-8 w-8 shrink-0">
                                            <AvatarImage src={pageUser.photoUrl} alt={`@${pageUser.username}`} />
                                            <AvatarFallback>{(pageUser.username || "A").charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0 overflow-hidden">
                                            <span className="text-sm font-medium truncate text-foreground/90">{pageUser.username}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{pageUser.role}</span>
                                        </div>
                                    </button>
                                }
                            />
                        )
                    )}
                </div>
            </aside>
        </TooltipProvider>
    );
}
