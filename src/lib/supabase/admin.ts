
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
  const supabaseAdmin = await getAdminSupabase();
  const supabase = createServerClient();
  const today = new Date().toISOString().split('T')[0];

  // 1. Fetch all users from Supabase Auth using the admin client
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching users from Supabase Auth:', authError);
    return [];
  }

  // 2. Fetch all roles from our user_roles table
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role, daily_assignments_limit');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return [];
  }

  // 3. Fetch subscribed counts for today
  const { data: subscribedTodayData, error: subscribedTodayError } =
    await supabase
      .from('daily_assignments')
      .select('user_id')
      .eq('is_subscribed', true)
      .eq('assignment_date', today);

  if (subscribedTodayError) {
    console.error(
      'Error fetching today subscribed counts:',
      subscribedTodayError
    );
    return [];
  }

  // 4. Fetch total subscribed counts
  const { data: subscribedTotalData, error: subscribedTotalError } =
    await supabase
      .from('daily_assignments')
      .select('user_id')
      .eq('is_subscribed', true);

  if (subscribedTotalError) {
    console.error(
      'Error fetching total subscribed counts:',
      subscribedTotalError
    );
    return [];
  }

  // Create helper maps
  const rolesMap = new Map(
    rolesData?.map((r) => [
      r.user_id,
      { role: r.role, daily_assignments_limit: r.daily_assignments_limit },
    ]) || []
  );

  const subscribedTodayCountMap = new Map<string, number>();
  if (subscribedTodayData) {
    for (const record of subscribedTodayData) {
      subscribedTodayCountMap.set(
        record.user_id,
        (subscribedTodayCountMap.get(record.user_id) || 0) + 1
      );
    }
  }

  const subscribedTotalCountMap = new Map<string, number>();
  if (subscribedTotalData) {
    for (const record of subscribedTotalData) {
      subscribedTotalCountMap.set(
        record.user_id,
        (subscribedTotalCountMap.get(record.user_id) || 0) + 1
      );
    }
  }

  // 5. Combine all data
  const usersWithRoles: UserWithRole[] = authData.users.map((user) => {
    const roleInfo = rolesMap.get(user.id);
    return {
      id: user.id,
      email: user.email!,
      role: (roleInfo?.role as UserRole) || 'member',
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

  // If the limit is being reduced, remove excess assignments for today
  const { data: currentAssignments, error: fetchError } = await supabase
    .from('daily_assignments')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (fetchError) {
    return { error: { message: 'Could not check current assignments.' } };
  }

  const currentCount = currentAssignments?.length || 0;

  if (newLimit < currentCount) {
    const assignmentsToRemove = currentCount - newLimit;

    // Get the IDs of the most recent assignments to remove
    const { data: assignmentsToDelete, error: selectError } = await supabase
      .from('daily_assignments')
      .select('id')
      .eq('user_id', userId)
      .eq('assignment_date', today)
      .order('created_at', { ascending: false })
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

  // Update the limit for the specified user
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
