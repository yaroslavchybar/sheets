
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
  
  // 1. Fetch all roles from our user_roles table. This is our source of truth for users.
  // We can now directly get the counts from this table.
  const { data: rolesData, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role, daily_assignments_limit, subscribed_today, subscribed_total');

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

  // Create helper map for roles
  const rolesMap = new Map(
    rolesData.map((r) => [
      r.user_id,
      { 
        role: r.role, 
        daily_assignments_limit: r.daily_assignments_limit,
        subscribed_today_count: r.subscribed_today,
        subscribed_total_count: r.subscribed_total,
      },
    ])
  );

  // 3. Combine all data, using the existing auth users as the base
  const usersWithRoles: UserWithRole[] = existingAuthUsers.map((user) => {
    const roleInfo = rolesMap.get(user.id);
    return {
      id: user.id,
      email: user.email!,
      role: (roleInfo?.role as UserRole) || 'member', // Fallback, though should always exist
      daily_assignments_limit: roleInfo?.daily_assignments_limit ?? 10,
      subscribed_today_count: roleInfo?.subscribed_today_count || 0,
      subscribed_total_count: roleInfo?.subscribed_total_count || 0,
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

  // Count of tasks currently assigned to the user for today (pending)
  const { count: pendingCount, error: pendingError } = await supabase
    .from('instagram_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('assignment_date', today)
    .eq('status', 'assigned');

  if (pendingError) {
    return { error: { message: 'Could not check pending assignments.' } };
  }
  
  // Get today's subscribed count directly from the user_roles table
  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('subscribed_today')
    .eq('user_id', userId)
    .single();
  
  if (roleError) {
    return { error: { message: "Could not check today's subscription count." } };
  }
  
  const subscribedTodayCount = userRole?.subscribed_today ?? 0;
  
  const totalGeneratedToday = (pendingCount ?? 0) + subscribedTodayCount;

  // If the new limit is less than what's already been generated, we need to un-assign some tasks
  if (newLimit < totalGeneratedToday) {
    const assignmentsToRemove = totalGeneratedToday - newLimit;

    // We can only remove from PENDING tasks
    if (assignmentsToRemove > 0 && (pendingCount ?? 0) > 0) {
      
      // Get the IDs of the most recently assigned tasks to un-assign
      const { data: assignmentsToUpdate, error: selectError } = await supabase
        .from('instagram_accounts')
        .select('id')
        .eq('assigned_to', userId)
        .eq('assignment_date', today)
        .eq('status', 'assigned')
        .order('created_at', { ascending: false })
        .limit(assignmentsToRemove);

      if (selectError) {
        return {
          error: { message: 'Could not retrieve assignments to remove.' },
        };
      }
      
      if (assignmentsToUpdate && assignmentsToUpdate.length > 0) {
        const idsToUpdate = assignmentsToUpdate.map((a) => a.id);
        const { error: updateError } = await supabase
          .from('instagram_accounts')
          .update({ 
            status: 'available',
            assigned_to: null,
            assignment_date: null
          })
          .in('id', idsToUpdate);

        if (updateError) {
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
