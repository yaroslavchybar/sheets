'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// This function requires an admin-level Supabase client to fetch all users.
// We are using the user's session to check if they are an admin.
// The RLS policies in the database will enforce that only admins can read all user roles.
export async function getAllUsersWithRoles() {
  const supabase = createClient();

  // Note: We can't directly join user_roles with auth.users in a single query
  // due to RLS and permissions. We fetch them separately and join them in code.

  // 1. Fetch all users from Supabase Auth
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('Error fetching users from Supabase Auth:', authError);
    return [];
  }

  // 2. Fetch all roles from our user_roles table
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id, role');

  if (rolesError) {
    console.error('Error fetching roles:', rolesError);
    // Continue with an empty roles array to at least show users
  }

  // Create a map of user_id -> role for easy lookup
  const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

  // 3. Combine the data
  const usersWithRoles = authUsers.users.map(user => ({
    id: user.id,
    email: user.email!,
    // Assign the role from our map, or default to 'member' if not found
    role: rolesMap.get(user.id) || 'member',
  }));
  
  // Sort users by email
  usersWithRoles.sort((a, b) => a.email.localeCompare(b.email));

  return usersWithRoles;
}

export async function updateUserRole(userId: string, role: 'admin' | 'member' | 'editor' | 'moderator') {
    const supabase = createClient();
    
    // Check if the current user is an admin before proceeding
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
        return { error: { message: 'You do not have permission to update roles.' } };
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
    revalidatePath('/'); // Revalidate the home page to update user nav
    return { error: null };
}
