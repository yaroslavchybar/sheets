
'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import type { UserWithRole, UserRole } from '../types';

// This function requires an admin-level Supabase client to fetch all users.
// We create a dedicated admin client here using the service role key.
async function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function getAllUsersWithRoles(): Promise<UserWithRole[]> {
  const supabase = createServerClient();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();


  // 1. Fetch all roles from our user_roles table. This is our source of truth.
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role, daily_assignments_limit');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return [];
  }

  // Get user IDs from the roles data
  const userIds = rolesData.map((r) => r.user_id);
  if (userIds.length === 0) {
    return [];
  }

  // 2. Fetch the corresponding users from Supabase Auth
  const supabaseAdmin = await getAdminSupabase();
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Adjust if you have more users
    });

  if (authError) {
    console.error('Error fetching users from Supabase Auth:', authError);
    return [];
  }
  
  // Filter auth users to only include those that exist in our user_roles table
  const existingAuthUsers = authData.users.filter(u => userIds.includes(u.id));

  // 3. Fetch subscribed counts for today for the existing users from the new table
  const { data: subscribedTodayData, error: subscribedTodayError } =
    await supabase
      .from('subscriptions')
      .select('user_id', { count: 'exact' })
      .gte('subscribed_at', todayStart)
      .in('user_id', userIds);

  if (subscribedTodayError) {
    console.error('Error fetching today subscribed counts:', subscribedTodayError);
  }

  // 4. Fetch total subscribed counts for the existing users from the new table
  const { data: subscribedTotalData, error: subscribedTotalError } =
    await supabase
      .from('subscriptions')
      .select('user_id', { count: 'exact' })
      .in('user_id', userIds);

  if (subscribedTotalError) {
    console.error('Error fetching total subscribed counts:', subscribedTotalError);
  }
  
  // Re-fetch counts using a different method if the first one failed or returned null
  const getCounts = async (gteFilter?: string) => {
    const counts = new Map<string, number>();
    for (const userId of userIds) {
        let query = supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        if (gteFilter) {
            query = query.gte('subscribed_at', gteFilter);
        }
        const { count, error } = await query;
        if (!error && count !== null) {
            counts.set(userId, count);
        }
    }
    return counts;
  };

  const subscribedTodayCountMap = await getCounts(todayStart);
  const subscribedTotalCountMap = await getCounts();


  // Create helper map for roles
  const rolesMap = new Map(
    rolesData.map((r) => [
      r.user_id,
      { role: r.role, daily_assignments_limit: r.daily_assignments_limit },
    ])
  );

  // 5. Combine all data, using the existing auth users as the base
  const usersWithRoles: UserWithRole[] = existingAuthUsers.map((user) => {
    const roleInfo = rolesMap.get(user.id);
    return {
      id: user.id,
      email: user.email!,
      role: (roleInfo?.role as UserRole) || 'member', // Fallback, though should always exist
      daily_assignments_limit: roleInfo?.daily_assignments_limit ?? 10,
      subscribed_today_count: subscribedTodayCountMap.get(user.id) || 0,
      subscribed_total_count: subscribedTotalCountMap.get(user.id) || 0,
    };
  });

  usersWithRoles.sort((a, b) => a.email.localeCompare(b.email));

  return usersWithRoles;
}

export async function updateUserRole(
  userId: string,
  role: UserRole
) {
  const supabase = createServerClient();

  // Check if the current user is an admin before proceeding
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: 'You must be logged in to update roles.' } };
  }

  const { data: adminProfile, error: adminError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (adminError || adminProfile?.role !== 'admin') {
    return {
      error: { message: 'You do not have permission to update roles.' },
    };
  }

  // Proceed with the update
  const { error } = await supabase
    .from('user_roles')
    .update({ role })
    .eq('user_id', userId);

  if (error) {
    return { error };
  }

  revalidatePath('/admin/users');
  revalidatePath('/');
  return { error: null };
}

export async function updateUserAssignmentLimit(
  userId: string,
  newLimit: number
) {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(today).toISOString();

  // Check if the current user is an admin before proceeding
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: { message: 'You must be logged in to update settings.' },
    };
  }
  const { data: adminProfile, error: adminError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (adminError || adminProfile?.role !== 'admin') {
    return {
      error: { message: 'You do not have permission to update settings.' },
    };
  }

  // Fetch count of PENDING assignments for today
  const { count: pendingCount, error: pendingError } = await supabase
    .from('daily_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (pendingError) {
    return { error: { message: 'Could not check pending assignments.' } };
  }

  // Fetch count of SUBSCRIBED assignments for today
  const { count: subscribedTodayCount, error: subscribedError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('subscribed_at', todayStart);

  if (subscribedError) {
    return { error: { message: 'Could not check today\'s subscriptions.' } };
  }

  const totalGeneratedToday = (pendingCount ?? 0) + (subscribedTodayCount ?? 0);

  // If the new limit is less than the total tasks already generated, remove excess pending tasks
  if (newLimit < totalGeneratedToday) {
    const assignmentsToRemove = totalGeneratedToday - newLimit;

    // We can only remove from the pending tasks, not the subscribed ones
    if (assignmentsToRemove > 0 && (pendingCount ?? 0) > 0) {
      const { data: assignmentsToDelete, error: selectError } = await supabase
        .from('daily_assignments')
        .select('id')
        .eq('user_id', userId)
        .eq('assignment_date', today)
        .order('created_at', { ascending: false }) // Remove the most recently added ones first
        .limit(assignmentsToRemove);

      if (selectError) {
        return {
          error: { message: 'Could not retrieve assignments to delete.' },
        };
      }

      if (assignmentsToDelete && assignmentsToDelete.length > 0) {
        const idsToDelete = assignmentsToDelete.map((a) => a.id);
        const { error: deleteError } = await supabase
          .from('daily_assignments')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          return { error: { message: 'Failed to remove excess assignments.' } };
        }
      }
    }
  }


  // Finally, update the limit in the user's profile
  const { error: updateError } = await supabase
    .from('user_roles')
    .update({ daily_assignments_limit: newLimit })
    .eq('user_id', userId);

  if (updateError) {
    return { error: updateError };
  }

  revalidatePath('/admin/users');
  revalidatePath('/'); // Revalidate the member dashboard
  return { error: null };
}


export async function createUser(
  email: string,
  password: string,
  role: UserRole
) {
  const supabase = createServerClient();
  const supabaseAdmin = await getAdminSupabase();

  // 1. Check if the current user is an admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) {
    return { error: { message: 'You must be logged in to create users.' } };
  }
  const { data: adminProfile, error: adminError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', currentUser.id)
    .single();
  if (adminError || adminProfile?.role !== 'admin') {
    return { error: { message: 'You do not have permission to create users.' } };
  }

  // 2. Create the new user in Supabase Auth
  const { data: newUser, error: createAuthError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm the user's email
    });

  if (createAuthError) {
    return { error: { message: `Failed to create user: ${createAuthError.message}` } };
  }
  
  if (!newUser.user) {
    return { error: { message: 'User was not returned after creation.' } };
  }

  // 3. Update the user's role in the user_roles table.
  // A trigger in Supabase should have already created a default 'member' role.
  const { error: updateRoleError } = await supabase.from('user_roles').update({
    role: role,
    daily_assignments_limit: role === 'member' ? 10 : 0, // Default limit
  }).eq('user_id', newUser.user.id);

  if (updateRoleError) {
    // If updating the role fails, we should try to clean up by deleting the auth user
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return { error: { message: `Failed to assign role: ${updateRoleError.message}. User has been removed.` } };
  }

  revalidatePath('/admin/users');
  return { error: null };
}

export async function triggerDayReset() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Check if the current user is an admin
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) {
    return { error: { message: 'You must be logged in to perform this action.' } };
  }
  const { data: adminProfile, error: adminError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', currentUser.id)
    .single();
  if (adminError || adminProfile?.role !== 'admin') {
    return { error: { message: 'You do not have permission to reset the day.' } };
  }

  // 2. Delete all of today's assignments, regardless of their status.
  const { error: deleteError } = await supabase
    .from('daily_assignments')
    .delete()
    .eq('assignment_date', today);

  if (deleteError) {
    return { error: { message: `Failed to clear tasks for today: ${deleteError.message}` } };
  }

  // 3. Revalidate paths to update UI for all users
  revalidatePath('/admin/users'); // For admin stats
  revalidatePath('/'); // For member dashboards
  
  return { error: null };
}
