
'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';
import { revalidatePath } from 'next/cache';

/**
 * Fetches the currently assigned daily tasks for a specific member.
 * This function NO LONGER assigns new tasks automatically.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of InstagramAccount tasks.
 */
export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch the final list of assignments for the user for today
  const { data: finalAssignments, error: finalError } = await supabase
    .from('daily_assignments')
    .select('id, instagram_id, created_at')
    .eq('user_id', userId)
    .eq('assignment_date', today)
    .order('created_at', { ascending: true });

  if (finalError) {
    console.error('Error fetching final assignments:', finalError);
    return [];
  }

  if (!finalAssignments || finalAssignments.length === 0) {
    return [];
  }

  // Fetch details for the assigned accounts from the sheet
  const allAccountsFromSheet = await getAvailableAccounts();
  if (!allAccountsFromSheet || allAccountsFromSheet.length === 0) {
    return [];
  }
  const idToAccountMap = new Map(allAccountsFromSheet.map((acc) => [acc.id, acc]));

  // Combine db data with sheet data
  const orderedTasks = finalAssignments
    .map((assignment) => {
      const accountDetails = idToAccountMap.get(assignment.instagram_id);
      if (!accountDetails) return undefined;

      return {
        ...accountDetails,
        assignmentId: assignment.id,
      };
    })
    .filter((task): task is InstagramAccount => task !== undefined);

  return orderedTasks;
}

/**
 * Triggers the assignment of daily tasks for the currently logged-in member.
 * It checks the user's limit, counts existing tasks, and assigns new ones if needed.
 */
export async function triggerAssignment() {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayStart = new Date(today).toISOString();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: { message: 'Пользователь не найден.' } };
  }
  const userId = user.id;

  // --- Daily Cleanup ---
  await supabase
    .from('daily_assignments')
    .delete()
    .eq('user_id', userId)
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

  if (assignmentLimit === 0) {
    await supabase.from('daily_assignments').delete().eq('user_id', userId).eq('assignment_date', today);
    revalidatePath('/');
    return { error: null };
  }

  // 2. Check how many tasks are ALREADY completed or in the queue for this user today
  const { count: pendingCount, error: pendingError } = await supabase
    .from('daily_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assignment_date', today);
  if (pendingError) {
    return { error: { message: 'Ошибка при проверке ожидающих задач.' } };
  }

  const { count: subscribedTodayCount, error: subscribedError } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('subscribed_at', todayStart);
  if (subscribedError) {
    return { error: { message: 'Ошибка при проверке сегодняшних подписок.' } };
  }

  const totalGeneratedToday = (pendingCount ?? 0) + (subscribedTodayCount ?? 0);
  
  if (totalGeneratedToday >= assignmentLimit) {
    revalidatePath('/');
    return { error: { message: 'Дневной лимит уже достигнут. Новые задачи не назначены.' } };
  }
  
  const tasksToAssignCount = assignmentLimit - totalGeneratedToday;

  // 3. If the user needs more tasks, fetch and assign them
  if (tasksToAssignCount > 0) {
    const { data: subscribedEver, error: subscribedEverError } = await supabase
      .from('subscriptions')
      .select('instagram_id')
      .eq('user_id', userId);
    if (subscribedEverError) {
      return { error: { message: 'Ошибка при получении истории подписок.' } };
    }
    const subscribedIds = new Set((subscribedEver || []).map((s) => s.instagram_id));

    const { data: assignedToday, error: assignedTodayError } = await supabase
        .from('daily_assignments')
        .select('instagram_id')
        .eq('assignment_date', today);
    if (assignedTodayError) {
        return { error: { message: 'Ошибка при проверке уже назначенных аккаунтов.' } };
    }
    const assignedTodayIds = new Set((assignedToday || []).map(a => a.instagram_id));

    const allAccounts = await getAvailableAccounts();
    if (allAccounts && allAccounts.length > 0) {
      const eligibleAccounts = allAccounts.filter(
        (acc) => !subscribedIds.has(acc.id) && !assignedTodayIds.has(acc.id)
      );
      
      eligibleAccounts.sort((a, b) => a.rowNumber - b.rowNumber);

      const newTasksToAssign = eligibleAccounts.slice(0, tasksToAssignCount);

      if (newTasksToAssign.length > 0) {
        const newAssignmentRecords = newTasksToAssign.map((task) => ({
          user_id: userId,
          instagram_id: task.id,
          assignment_date: today,
        }));
        
        const { error: insertError } = await supabase
          .from('daily_assignments')
          .upsert(newAssignmentRecords, { 
            onConflict: 'instagram_id, assignment_date',
            ignoreDuplicates: true 
        });

        if (insertError) {
            return { error: { message: `Ошибка сохранения назначений: ${insertError.message}` } };
        }
      }
    }
  }

  revalidatePath('/');
  return { error: null };
}
