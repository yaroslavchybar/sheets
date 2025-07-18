'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// This function requires an admin-level Supabase client to fetch all users.
// We are using the user's session to check if they are an admin.
// The RLS policies in the database will enforce that only admins can read all user roles.
export async function getAllUsersWithRoles() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      user_id,
      role,
      users (
        email
      )
    `)
    .order('email', { referencedTable: 'users', ascending: true });

  if (error) {
    console.error('Error fetching users with roles:', error);
    return [];
  }

  return data.map((item: any) => ({
    id: item.user_id,
    email: item.users.email,
    role: item.role,
  }));
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
