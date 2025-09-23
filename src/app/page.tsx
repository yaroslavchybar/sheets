import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Dashboard from '@/components/dashboard';
import type { AppUser, InstagramAccount } from '@/lib/types';
import { getDailyTasksForMember } from '@/services/assignment';

export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's role from the user_roles table
  const { data: profile } = await supabase
    .from('user_roles')
    .select('role, subscribed_today')
    .eq('user_id', user.id)
    .single();

  // If the user is an admin, redirect them to the user management page.
  if (profile?.role === 'admin') {
    redirect('/admin/users');
  }

  const appUser: AppUser = {
    id: user.id,
    email: user.email!,
    username: user.email!.split('@')[0],
    photoUrl: user.user_metadata.avatar_url || `https://placehold.co/40x40/212529/F8F9FA/png?text=${user.email!.charAt(0).toUpperCase()}`,
    role: profile?.role as AppUser['role'] || 'member', // Assign role, default to 'member'
  }

  // Just fetch existing tasks. Assignment is now a manual process.
  const dailyTasks: InstagramAccount[] = await getDailyTasksForMember(appUser.id);
  
  // Fetch today's subscription count directly from the user_roles table
  const subscribedTodayCount = profile?.subscribed_today ?? 0;

  return <Dashboard user={appUser} tasks={dailyTasks} subscribedTodayCount={subscribedTodayCount} />;
}
