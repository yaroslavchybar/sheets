'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

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

export async function getAllUsersWithRoles() {
  const supabaseAdmin = await getAdminSupabase();
  const supabase = createServerClient();

  // 1. Fetch all users from Supabase Auth using the admin client
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

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
  }

  // Create a map of user_id -> role for easy lookup
  const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

  // 3. Combine the data
  const usersWithRoles = authData.users.map(user => ({
    id: user.id,
    email: user.email!,
    role: rolesMap.get(user.id) || 'member',
  }));

  usersWithRoles.sort((a, b) => a.email.localeCompare(b.email));

  return usersWithRoles;
}

export async function updateUserRole(userId: string, role: 'admin' | 'member' | 'editor' | 'moderator') {
    const supabase = createServerClient();
    
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
    revalidatePath('/');
    return { error: null };
}
