import { createClient } from '@/lib/supabase/server';
import { getSettings } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sheet } from 'lucide-react';
import { UserNav } from '@/components/user-nav';
import type { AppUser } from '@/lib/types';
import { SettingsForm } from './_components/settings-form';

export default async function AdminSettingsPage() {
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

  const settings = await getSettings();

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
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Manage core application settings here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm settings={settings} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
