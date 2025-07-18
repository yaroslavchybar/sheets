'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { updateUserAssignmentLimit } from '@/lib/supabase/admin';
import { useTransition } from 'react';
import { Save } from 'lucide-react';

const formSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(0, { message: 'Must be 0 or more.' })
    .max(100, { message: 'Cannot exceed 100.' }),
});

type UserAssignmentInputProps = {
  userId: string;
  currentLimit: number;
};

export function UserAssignmentInput({
  userId,
  currentLimit,
}: UserAssignmentInputProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      limit: currentLimit,
    },
  });

  const { isDirty } = form.formState;

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const { error } = await updateUserAssignmentLimit(userId, values.limit);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message,
        });
        form.reset({ limit: currentLimit }); // Reset on failure
      } else {
        toast({
          title: 'Limit Updated',
          description: `Assignment limit has been saved.`,
        });
        form.reset({ limit: values.limit }); // Reset to new value to clear dirty state
      }
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex items-start gap-2"
      >
        <FormField
          control={form.control}
          name="limit"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  className="h-9 w-24 text-center"
                />
              </FormControl>
              <FormMessage className="mt-1 text-xs" />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          disabled={isPending || !isDirty}
        >
          <Save className="h-4 w-4" />
          <span className="sr-only">Save</span>
        </Button>
      </form>
    </Form>
  </change>
  <change>
    <file>/src/app/admin/users/page.tsx</file>
    <content><![CDATA[import { createClient } from '@/lib/supabase/server';
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
import { UserAssignmentInput } from './_components/user-assignment-input';

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
              Manage user roles and daily assignment limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[180px]">Role</TableHead>
                    <TableHead className="w-[180px]">Daily Limit</TableHead>
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
                           <span className="text-sm text-muted-foreground">-</span>
                        )}
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
