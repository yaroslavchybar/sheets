
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { InstagramAccount } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetches the currently assigned daily tasks for a specific member.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of InstagramAccount tasks.
 */
export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient(); // Use the user's client to respect RLS
  const today = new Date().toISOString().split('T')[0];

  // Fetch all tasks that are assigned to the user for today and are not yet subscribed.
  // This query is allowed by our RLS policy.
  const { data: assignedTasks, error } = await supabase
    .from('instagram_accounts')
    .select('id, user_name, full_name, status')
    .eq('assigned_to', userId)
    .eq('assignment_date', today)
    .eq('status', 'assigned')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching assigned tasks:', error);
    return [];
  }

  const tasks: InstagramAccount[] = assignedTasks.map(task => ({
      id: task.id,
      userName: task.user_name,
      fullName: task.full_name ?? '',
      profileUrl: `https://www.instagram.com/${task.user_name}`,
      status: 'assigned'
  }));

  return tasks;
}

/**
 * Triggers the assignment of daily tasks for the currently logged-in member.
 * This function uses the admin client to bypass RLS for finding and assigning tasks.
 */
export async function triggerAssignment() {
  const userClient = createClient(); // Client for getting the current user
  const adminClient = createAdminClient(); // Admin client for elevated privileges
  const today = new Date().toISOString().split('T')[0];

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return { error: { message: 'Пользователь не найден.' } };
  }
  const userId = user.id;

  // --- Daily Cleanup: Use admin client to reset old tasks ---
  await adminClient
    .from('instagram_accounts')
    .update({ 
        status: 'available',
        assigned_to: null,
        assignment_date: null
    })
    .eq('assigned_to', userId)
    .eq('status', 'assigned')
    .neq('assignment_date', today);

  // 1. Get user's limit (using admin client to be safe)
  const { data: userRole, error: userRoleError } = await adminClient
    .from('user_roles')
    .select('daily_assignments_limit')
    .eq('user_id', userId)
    .single();

  if (userRoleError || !userRole) {
    return { error: { message: 'Не удалось получить лимит назначений.' }};
  }
  const assignmentLimit = userRole.daily_assignments_limit;

  if (assignmentLimit === 0) {
    await adminClient.from('instagram_accounts').update({
        status: 'available',
        assigned_to: null,
        assignment_date: null
    }).eq('assigned_to', userId).eq('assignment_date', today);
    revalidatePath('/');
    return { error: null };
  }

  // 2. Check existing tasks (using admin client)
  const { count: generatedTodayCount, error: generatedTodayError } = await adminClient
    .from('instagram_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('assigned_to', userId)
    .eq('assignment_date', today);

  if (generatedTodayError) {
    return { error: { message: 'Ошибка при проверке уже сгенерированных задач.' } };
  }
  
  if (generatedTodayCount >= assignmentLimit) {
    revalidatePath('/');
    return { error: { message: 'Дневной лимит уже достигнут. Новые задачи не назначены.' } };
  }
  
  const remainingTasks = assignmentLimit - generatedTodayCount;
  const tasksToAssignCount = Math.min(10, remainingTasks);

  // 3. Assign new tasks if needed (using admin client)
  if (tasksToAssignCount > 0) {
    const { data: userHistory, error: historyError } = await adminClient
      .from('instagram_accounts')
      .select('id')
      .eq('assigned_to', userId)
      .in('status', ['subscribed', 'skip']);
      
    if (historyError) {
        return { error: { message: 'Ошибка при получении истории подписок.' } };
    }
    const subscribedIds = new Set((userHistory || []).map(h => h.id));

    let query = adminClient
        .from('instagram_accounts')
        .select('id')
        .eq('status', 'available');

    if (subscribedIds.size > 0) {
      query = query.not('id', 'in', `(${Array.from(subscribedIds).join(',')})`);
    }

    const { data: eligibleAccounts, error: eligibleError } = await query.limit(tasksToAssignCount);

    if (eligibleError) {
        return { error: { message: 'Ошибка при поиске доступных аккаунтов.' }};
    }
    
    if (eligibleAccounts && eligibleAccounts.length > 0) {
        const accountIdsToAssign = eligibleAccounts.map(acc => acc.id);
        const { error: updateError } = await adminClient
            .from('instagram_accounts')
            .update({
                status: 'assigned',
                assigned_to: userId,
                assignment_date: today
            })
            .in('id', accountIdsToAssign);

        if (updateError) {
            return { error: { message: `Ошибка при назначении задач: ${updateError.message}` } };
        }
    }
  }

  revalidatePath('/');
  return { error: null };
}
