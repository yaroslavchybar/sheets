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

  const appUser: AppUser = {
    id: user.id,
    email: user.email!,
    username: user.email!.split('@')[0],
    photoUrl: user.user_metadata.avatar_url || `https://placehold.co/40x40/212529/F8F9FA/png?text=${user.email!.charAt(0).toUpperCase()}`,
  }

  return <Dashboard user={appUser} />;
}
