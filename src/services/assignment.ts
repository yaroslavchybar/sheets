
'use server';

import { createClient } from '@/lib/supabase/server';
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
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch all tasks that are assigned to the user for today and are not yet subscribed.
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

  // Map the database result to the InstagramAccount type.
  const tasks: InstagramAccount[] = assignedTasks.map(task => ({
      id: task.id,
      userName: task.user_name,
      fullName: task.full_name ?? '',
      profileUrl: `https://www.instagram.com/${task.user_name}`,
      status: 'assigned' // We know the status is 'assigned' from the query.
  }));

  return tasks;
}

/**
 * Triggers the assignment of daily tasks for the currently logged-in member.
 * It checks the user's limit, counts existing tasks, and assigns new ones if needed.
 */
export async function triggerAssignment() {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: 'Пользователь не найден.' } };
  }
  const userId = user.id;

  // --- Daily Cleanup: Reset any of this user's tasks from previous days that are still 'assigned' ---
  await supabase
    .from('instagram_accounts')
    .update({ 
        status: 'available',
        assigned_to: null,
        assignment_date: null
    })
    .eq('assigned_to', userId)
    .eq('status', 'assigned')
    .neq('assignment_date', today);

  // 1. Get the user's assignment limit
  const { data: userRole, error: userRoleError } = await supabase
    .from('user_roles')
    .select('daily_assignments_limit')
    .eq('user_id', userId)
    .single();

  if (userRoleError || !userRole) {
    console.error('Error fetching user assignment limit:', userRoleError);
    return { error: { message: 'Не удалось получить лимит назначений.' }};
  }
  const assignmentLimit = userRole.daily_assignments_limit;

  // If the user's limit is 0, make sure they have no assigned tasks for today.
  if (assignmentLimit === 0) {
    await supabase.from('instagram_accounts').update({
        status: 'available',
        assigned_to: null,
        assignment_date: null
    }).eq('assigned_to', userId).eq('assignment_date', today);
    revalidatePath('/');
    return { error: null };
  }

  // 2. Check how many tasks are ALREADY generated for this user today (assigned or subscribed)
    const { count: generatedTodayCount, error: generatedTodayError } = await supabase
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
  const tasksToAssignCount = Math.min(10, remainingTasks); // Assign in batches of 10

  // 3. If the user needs more tasks, fetch available accounts and assign them
  if (tasksToAssignCount > 0) {
    
    // Get a list of accounts that the current user has ever subscribed to or skipped. We don't want to re-assign them.
    const { data: userHistory, error: historyError } = await supabase
      .from('instagram_accounts')
      .select('id')
      .eq('assigned_to', userId)
      .in('status', ['subscribed', 'skip']);
      
    if (historyError) {
        return { error: { message: 'Ошибка при получении истории подписок.' } };
    }
    const subscribedIds = new Set((userHistory || []).map(h => h.id));

    // Find accounts that are 'available' and have never been interacted with by this user.
    let query = supabase
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

        // Assign the accounts to the user
        const { error: updateError } = await supabase
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

