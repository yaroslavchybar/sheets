
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
  // Delete any of this user's incomplete tasks from any day that is NOT today.
  await supabase
    .from('daily_assignments')
    .delete()
    .eq('user_id', userId)
    .eq('is_subscribed', false)
    .neq('assignment_date', today);
  
  // 1. Get the user's current assignment limit first. This is crucial.
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

  // If limit is 0, they should have no tasks.
  if (assignmentLimit === 0) {
      // Also clean up any existing tasks for today if their limit was just set to 0
      await supabase.from('daily_assignments').delete().eq('user_id', userId).eq('assignment_date', today);
      return [];
  }

  // 2. Check how many assignments were ALREADY generated for this user today
  const { count: assignmentsGeneratedCount, error: countError } = await supabase
    .from('daily_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (countError) {
    console.error('Error checking for existing assignments:', countError);
    return [];
  }
  
  const tasksToAssignCount = assignmentLimit - (assignmentsGeneratedCount ?? 0);

  // 3. If the user needs more tasks to meet their current limit (either new or increased)
  if (tasksToAssignCount > 0) {
    // Get all accounts that have ever been assigned to anyone, on any date.
    const { data: allEverAssigned, error: allEverError } = await supabase
        .from('daily_assignments')
        .select('instagram_id');

    if (allEverError) {
        console.error("Error fetching all ever assigned accounts:", allEverError);
        return [];
    }
    const everAssignedIds = new Set(allEverAssigned.map((a) => a.instagram_id));
    
    // Get available accounts from the sheet and filter out any that have ever been assigned.
    const allAccounts = await getAvailableAccounts();
    if (allAccounts && allAccounts.length > 0) {
        // Filter out any account that has an entry in our assignments table.
        const trulyUnassignedAccounts = allAccounts.filter((acc) => !everAssignedIds.has(acc.id));
        
        // Sort for consistent assignment order to reduce race conditions
        trulyUnassignedAccounts.sort((a, b) => a.id.localeCompare(b.id));

        const newTasksToAssign = trulyUnassignedAccounts.slice(0, tasksToAssignCount);

        // Insert new assignments into the database
        if (newTasksToAssign.length > 0) {
          const newAssignmentRecords = newTasksToAssign.map((task) => ({
            user_id: userId,
            instagram_id: task.id,
            assignment_date: today,
          }));

          const { error: insertError } = await supabase
            .from('daily_assignments')
            .insert(newAssignmentRecords, {
              // This is the key fix: if a duplicate is inserted (due to a race condition), ignore it.
              // This requires the 'unique_instagram_id_assignment_date' constraint to be set on the table.
              onConflict: 'instagram_id, assignment_date',
            });

          if (insertError) {
            console.error('Error saving new assignments:', insertError);
          }
        }
    }
  }

  // 4. --- This part runs on EVERY load ---
  // Fetch the ACTIVE (not deleted) assignments for the user for today.
  const { data: activeAssignments, error: activeError } = await supabase
    .from('daily_assignments')
    .select('id, instagram_id, created_at, is_subscribed, is_deleted')
    .eq('user_id', userId)
    .eq('assignment_date', today)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (activeError) {
    console.error('Error fetching active assignments:', activeError);
    return [];
  }
  
  if (!activeAssignments || activeAssignments.length === 0) {
    return [];
  }

  // 5. Fetch details for the active assignments from the sheet
  const allAccountsFromSheet = await getAvailableAccounts();

  if (!allAccountsFromSheet || allAccountsFromSheet.length === 0) {
    return [];
  }
  
  const idToAccountMap = new Map(allAccountsFromSheet.map(acc => [acc.id, acc]));
  
  // 6. Combine db data with sheet data
  const orderedTasks = activeAssignments
    .map(assignment => {
      const accountDetails = idToAccountMap.get(assignment.instagram_id);
      if (!accountDetails) return undefined;
      
      return {
        ...accountDetails,
        assignmentId: assignment.id,
        isSubscribed: assignment.is_subscribed,
        isDeleted: assignment.is_deleted,
      };
    })
    .filter((task): task is InstagramAccount => task !== undefined);

  return orderedTasks;
}
