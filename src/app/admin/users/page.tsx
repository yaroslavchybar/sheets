
import { createClient } from '@/lib/supabase/server';
import { getAllUsersWithRoles } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserRoleSelector } from './_components/user-role-selector';
import { UserRoundCheck } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import type { AppUser } from '@/lib/types';
import { UserAssignmentInput } from './_components/user-assignment-input';
import { AddUserDialog } from './_components/add-user-dialog';
import { Separator } from '@/components/ui/separator';

export default async function AdminUsersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return redirect('/');
  }

  const users = await getAllUsersWithRoles();

  const pageUser: AppUser = {
    id: user.id,
    email: user.email!,
    username: user.email!.split('@')[0],
    photoUrl:
      user.user_metadata.avatar_url ||
      `https://placehold.co/40x40/212529/F8F9FA/png?text=${user.email!
        .charAt(0)
        .toUpperCase()}`,
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <UserRoundCheck className="h-6 w-6" />
          <span>F/U - Admin</span>
        </div>
        <div className="ml-auto">
          <UserNav user={pageUser} />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user roles, daily assignment limits, and view activity.
                </CardDescription>
              </div>
              <AddUserDialog />
            </div>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden w-full rounded-md border md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[180px]">Role</TableHead>
                    <TableHead className="w-[150px]">Daily Limit</TableHead>
                    <TableHead className="w-[150px] text-center">
                      Subscribed (Today)
                    </TableHead>
                    <TableHead className="w-[150px] text-center">
                      Subscribed (Total)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.email}
                        {u.id === user.id && (
                          <Badge variant="outline" className="ml-2">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <UserRoleSelector
                          userId={u.id}
                          currentRole={u.role}
                          isCurrentUser={u.id === user.id}
                        />
                      </TableCell>
                      <TableCell>
                        {u.role === 'member' ? (
                          <UserAssignmentInput
                            userId={u.id}
                            currentLimit={u.daily_assignments_limit}
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.role === 'member' ? (
                          <span className="font-medium">
                            {u.subscribed_today_count}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.role === 'member' ? (
                          <span className="font-medium">
                            {u.subscribed_total_count}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
              {users.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate pr-2">{u.email}</span>
                      {u.id === user.id && (
                        <Badge variant="outline">You</Badge>
                      )}
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground">
                        Role
                      </span>
                      <div className="w-1/2">
                        <UserRoleSelector
                          userId={u.id}
                          currentRole={u.role}
                          isCurrentUser={u.id === user.id}
                        />
                      </div>
                    </div>

                    {u.role === 'member' && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">
                          Daily Limit
                        </span>
                        <UserAssignmentInput
                          userId={u.id}
                          currentLimit={u.daily_assignments_limit}
                        />
                      </div>
                    )}
                    
                    {u.role === 'member' && (
                        <>
                            <Separator/>
                             <div className="flex items-center justify-between text-center text-sm">
                                <div className='flex-1'>
                                    <p className="font-semibold">{u.subscribed_today_count}</p>
                                    <p className="text-xs text-muted-foreground">Today</p>
                                </div>
                                <div className='flex-1'>
                                    <p className="font-semibold">{u.subscribed_total_count}</p>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                            </div>
                        </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
