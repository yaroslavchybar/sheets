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
import { Sheet } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import type { AppUser } from '@/lib/types';

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
    photoUrl: user.user_metadata.avatar_url || `https://placehold.co/40x40/212529/F8F9FA/png?text=${user.email!.charAt(0).toUpperCase()}`,
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <div className="flex items-center gap-2 font-semibold">
          <Sheet className="h-6 w-6" />
          <span>SheetFlow - Admin</span>
        </div>
        <div className="ml-auto">
          <UserNav user={pageUser} />
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage user roles across the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[180px]">Role</TableHead>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
