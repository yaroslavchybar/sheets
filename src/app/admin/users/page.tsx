'use client';

import { useSession, getSessionToken } from '@/hooks/use-session';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useRouter } from 'next/navigation';
import { useEffect, useTransition, useState, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRoleSelector } from './_components/user-role-selector';
import { UserAssignmentInput } from './_components/user-assignment-input';
import { AddUserDialog } from './_components/add-user-dialog';
import { useToast } from '@/hooks/use-toast';
import type { AppUser } from '@/lib/types';
import {
  Trash2, Users, CheckCircle, Database, Send, Clock, Ban
} from 'lucide-react';

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color, delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  delay: string;
}) {
  return (
    <div className={`animate-fade-in-up ${delay} group relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30`}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon className={`h-16 w-16 ${color}`} />
      </div>
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`text-3xl font-black tracking-tight tabular-nums ${color}`}>{value.toLocaleString()}</p>
        </div>
        <div className={`rounded-full p-2.5 ${color} bg-current/10 shadow-sm ring-1 ring-current/20`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-500 ${color}`} />
    </div>
  );
}

// ── Avatar Initials ────────────────────────────────────────────
function UserAvatar({ email }: { email: string }) {
  const initial = email.charAt(0).toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initial}
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────────────────
export default function AdminUsersPage() {
  const { user: session, isLoading, token } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const users = useQuery(api.users.getAllUsersWithRoles, token ? { sessionToken: token } : "skip");
  const stats = useQuery(api.instagramAccounts.getStats, token ? { sessionToken: token } : "skip");
  const deleteUserMutation = useMutation(api.users.deleteUser);
  const [isDeleting, startDeleteTransition] = useTransition();

  const handleDeleteUser = (userId: string, email: string) => {
    const t = getSessionToken();
    if (!t) return;
    startDeleteTransition(async () => {
      try {
        await deleteUserMutation({ sessionToken: t, userId: userId as Id<"users"> });
        toast({ title: 'Пользователь удален', description: `${email} успешно удален.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Ошибка удаления', description: error.message });
      }
    });
  };

  useEffect(() => {
    if (!isLoading && !session) router.push('/login');
  }, [isLoading, session, router]);

  useEffect(() => {
    if (session && session.role !== 'admin') router.push('/');
  }, [session, router]);

  if (isLoading || !session || users === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-5xl p-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (session.role !== 'admin') return null;

  const pageUser: AppUser = {
    id: session.id,
    email: session.email,
    username: session.email.split('@')[0],
    photoUrl: `https://placehold.co/40x40/212529/F8F9FA/png?text=${session.email.charAt(0).toUpperCase()}`,
    role: 'admin',
  };

  const statItems = stats ? [
    { label: 'Всего', value: stats.total, icon: Database, color: 'text-foreground', delay: 'stagger-1' },
    { label: 'Доступно', value: stats.available, icon: Clock, color: 'text-emerald-500', delay: 'stagger-2' },
    { label: 'Назначено', value: stats.assigned, icon: Users, color: 'text-blue-500', delay: 'stagger-3' },
    { label: 'Отправлено', value: stats.sent, icon: Send, color: 'text-violet-500', delay: 'stagger-4' },
    { label: 'Пропущено', value: stats.skipped, icon: Ban, color: 'text-muted-foreground', delay: 'stagger-5' },
  ] : [];

  const members = (users ?? []).filter(u => u.role === 'member');
  const admins = (users ?? []).filter(u => u.role === 'admin');
  const sortedUsers = [...admins, ...members];

  return (
    <div className="flex flex-col gap-8">
      {/* Overview Head */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Обзор & Пользователи</h1>
        <p className="text-muted-foreground mt-2">
          Просматривайте статистику базы данных и управляйте правами доступа пользователей.
        </p>
      </div>
      {/* Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statItems.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      {/* Users Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Список пользователей</h2>
          <AddUserDialog />
        </div>
        <div className="animate-fade-in-up stagger-1">
          {/* Desktop Table */}
          <div className="hidden md:block rounded-2xl border bg-card/50 shadow-sm overflow-hidden backdrop-blur-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                  <TableHead className="w-[300px] py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Пользователь</TableHead>
                  <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Роль</TableHead>
                  <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Дневной лимит</TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">DM сегодня</TableHead>
                  <TableHead className="w-[120px] text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">DM всего</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((u) => (
                  <TableRow key={u.id} className="group transition-colors hover:bg-muted/50 h-16 cursor-default">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <UserAvatar email={u.email} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground/90 truncate">{u.email}</p>
                          {u.id === session.id && (
                            <Badge variant="secondary" className="mt-1 text-[10px] uppercase font-bold px-2 py-0 bg-primary/10 text-primary border-primary/20">Вы</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserRoleSelector userId={u.id} currentRole={u.role} isCurrentUser={u.id === session.id} />
                    </TableCell>
                    <TableCell>
                      {u.role === 'member' ? (
                        <UserAssignmentInput userId={u.id} currentLimit={u.daily_assignments_limit} />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.role === 'member' ? (
                        <span className="font-semibold tabular-nums">{u.sent_today_count}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.role === 'member' ? (
                        <span className="font-semibold tabular-nums">{u.sent_total_count}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.id !== session.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all" disabled={isDeleting}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Пользователь <span className="font-semibold text-foreground">{u.email}</span> будет удален навсегда.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(u.id, u.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-4 md:hidden">
            {sortedUsers.map((u) => (
              <Card key={u.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-muted/60">
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar email={u.email} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate text-base text-foreground/90">{u.email}</p>
                      {u.id === session.id && <Badge variant="secondary" className="text-[10px] px-2 py-0 uppercase font-bold bg-primary/10 text-primary border-primary/20 mt-1">Вы</Badge>}
                    </div>
                  </div>
                  <div className="h-px w-full bg-border/50" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Роль</span>
                    <div className="w-1/2">
                      <UserRoleSelector userId={u.id} currentRole={u.role} isCurrentUser={u.id === session.id} />
                    </div>
                  </div>
                  {u.role === 'member' && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Лимит</span>
                      <UserAssignmentInput userId={u.id} currentLimit={u.daily_assignments_limit} />
                    </div>
                  )}
                  {u.role === 'member' && (
                    <>
                      <Separator />
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded-lg bg-muted/30 p-2">
                          <p className="text-lg font-bold tabular-nums">{u.sent_today_count}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">DM сегодня</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2">
                          <p className="text-lg font-bold tabular-nums">{u.sent_total_count}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">DM всего</p>
                        </div>
                      </div>
                    </>
                  )}
                  {u.id !== session.id && (
                    <>
                      <Separator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" disabled={isDeleting}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Пользователь <span className="font-semibold text-foreground">{u.email}</span> будет удален навсегда.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(u.id, u.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
