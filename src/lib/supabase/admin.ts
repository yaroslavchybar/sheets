
'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { UserWithRole, UserRole } from '../types';
import { createAdminClient } from './admin-client';

export async function getAllUsersWithRoles(): Promise<UserWithRole[]> {
  const supabaseAdmin = createAdminClient();
  
  // 1. Fetch all roles from our user_roles table.
  const { data: rolesData, error: rolesError } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role, daily_assignments_limit, subscribed_today, subscribed_total');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    return [];
  }

  const userIds = rolesData.map((r) => r.user_id);
  if (userIds.length === 0) {
    return [];
  }

  // 2. Fetch the corresponding users from Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (authError) {
    console.error('Error fetching users from Supabase Auth:', authError);
    return [];
  }
  
  const existingAuthUsers = authData.users.filter(u => userIds.includes(u.id));

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

  // 3. Combine all data
  const usersWithRoles: UserWithRole[] = existingAuthUsers.map((user) => {
    const roleInfo = rolesMap.get(user.id);
    return {
      id: user.id,
      email: user.email!,
      role: (roleInfo?.role as UserRole) || 'member',
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
  const supabaseAdmin = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
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

  const { error } = await supabaseAdmin
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
  const supabaseAdmin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: { user } } = await supabase.auth.getUser();
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

  const { count: pendingCount, error: pendingError } = await supabaseAdmin
    .from('instagram_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('assignment_date', today)
    .eq('status', 'assigned');

  if (pendingError) {
    return { error: { message: 'Could not check pending assignments.' } };
  }
  
  const { data: userRole, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('subscribed_today')
    .eq('user_id', userId)
    .single();
  
  if (roleError) {
    return { error: { message: "Could not check today's subscription count." } };
  }
  
  const subscribedTodayCount = userRole?.subscribed_today ?? 0;
  
  const totalGeneratedToday = (pendingCount ?? 0) + subscribedTodayCount;

  if (newLimit < totalGeneratedToday) {
    const assignmentsToRemove = totalGeneratedToday - newLimit;

    if (assignmentsToRemove > 0 && (pendingCount ?? 0) > 0) {
      
      const { data: assignmentsToUpdate, error: selectError } = await supabaseAdmin
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
        const { error: updateError } = await supabaseAdmin
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

  const { error: updateError } = await supabaseAdmin
    .from('user_roles')
    .update({ daily_assignments_limit: newLimit })
    .eq('user_id', userId);

  if (updateError) {
    return { error: updateError };
  }

  revalidatePath('/admin/users');
  revalidatePath('/');
  return { error: null };
}


export async function createUser(
  email: string,
  password: string,
  role: UserRole
) {
  const supabase = createServerClient();
  const supabaseAdmin = createAdminClient();

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

  const { data: newUser, error: createAuthError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createAuthError) {
    return { error: { message: `Failed to create user: ${createAuthError.message}` } };
  }
  
  if (!newUser.user) {
    return { error: { message: 'User was not returned after creation.' } };
  }

  const { error: updateRoleError } = await supabaseAdmin.from('user_roles').update({
    role: role,
    daily_assignments_limit: role === 'member' ? 10 : 0,
  }).eq('user_id', newUser.user.id);

  if (updateRoleError) {
    await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
    return { error: { message: `Failed to assign role: ${updateRoleError.message}. User has been removed.` } };
  }

  revalidatePath('/admin/users');
  return { error: null };
}
