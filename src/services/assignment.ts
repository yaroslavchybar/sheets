
'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';

export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // --- Daily Cleanup ---
  // Delete any of this user's tasks from any day that is NOT today.
  // This cleans up any leftover tasks from previous days that were not completed.
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
    return [];
  }
  const assignmentLimit = userRole.daily_assignments_limit;

  if (assignmentLimit === 0) {
    // Clean up any existing tasks for today if limit was set to 0
    await supabase.from('daily_assignments').delete().eq('user_id', userId).eq('assignment_date', today);
    return [];
  }

  // 2. Check how many assignments are ALREADY in the queue for this user today
  const { count: assignmentsInQueue, error: countError } = await supabase
    .from('daily_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (countError) {
    console.error('Error checking for existing assignments:', countError);
    return [];
  }

  const tasksToAssignCount = assignmentLimit - (assignmentsInQueue ?? 0);

  // 3. If the user needs more tasks, fetch and assign them
  if (tasksToAssignCount > 0) {
    // Get all accounts this user has *ever* subscribed to, to avoid re-assigning them.
    const { data: subscribedEver, error: subscribedEverError } = await supabase
      .from('subscriptions')
      .select('instagram_id')
      .eq('user_id', userId);

    if (subscribedEverError) {
      console.error('Error fetching user subscription history:', subscribedEverError);
      return [];
    }
    const subscribedIds = new Set((subscribedEver || []).map((s) => s.instagram_id));

    // Also get accounts that are already in someone's queue for today.
    const { data: assignedToday, error: assignedTodayError } = await supabase
        .from('daily_assignments')
        .select('instagram_id')
        .eq('assignment_date', today);
    
    if (assignedTodayError) {
        console.error('Error fetching accounts assigned today:', assignedTodayError);
        return [];
    }
    const assignedTodayIds = new Set((assignedToday || []).map(a => a.instagram_id));


    // Get available accounts from the sheet and filter out any that are ineligible
    const allAccounts = await getAvailableAccounts();
    if (allAccounts && allAccounts.length > 0) {
      const eligibleAccounts = allAccounts.filter(
        (acc) => !subscribedIds.has(acc.id) && !assignedTodayIds.has(acc.id)
      );
      
      // Sort for consistent assignment order
      eligibleAccounts.sort((a, b) => a.rowNumber - b.rowNumber);

      const newTasksToAssign = eligibleAccounts.slice(0, tasksToAssignCount);

      if (newTasksToAssign.length > 0) {
        const newAssignmentRecords = newTasksToAssign.map((task) => ({
          user_id: userId,
          instagram_id: task.id,
          assignment_date: today,
        }));
        
        // This insert is safe from race conditions because of the database-level unique constraint
        // on (instagram_id, assignment_date) which we can add. For now, we rely on filtering.
        const { error: insertError } = await supabase
          .from('daily_assignments')
          .insert(newAssignmentRecords);

        if (insertError) {
          // It's possible a race condition occurred. We can log it but proceed,
          // as the user will get fewer tasks this time but more on the next reload.
          console.error('Error saving new assignments (might be a race condition):', insertError.message);
        }
      }
    }
  }

  // 4. Fetch the final list of assignments for the user for today
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

  // 5. Fetch details for the assigned accounts from the sheet
  const allAccountsFromSheet = await getAvailableAccounts();
  if (!allAccountsFromSheet || allAccountsFromSheet.length === 0) {
    return [];
  }
  const idToAccountMap = new Map(allAccountsFromSheet.map((acc) => [acc.id, acc]));

  // 6. Combine db data with sheet data
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
