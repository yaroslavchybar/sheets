import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import type { AppUser } from '@/lib/types';

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  const appUser: AppUser = {
    id: user.id,
    email: user.email!,
    username: user.email!.split('@')[0],
    photoUrl: user.user_metadata.avatar_url || `https://placehold.co/40x40/212529/F8F9FA/png?text=${user.email!.charAt(0).toUpperCase()}`,
    role: profile?.role,
  }

  return <Dashboard user={appUser} />;
}
