
'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';

export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Check if assignments have ALREADY been generated for this user today.
  // We check for any records, including deleted ones, to see if the initial generation has occurred.
  const { count: assignmentsGeneratedCount, error: countError } = await supabase
    .from('daily_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (countError) {
    console.error('Error checking for existing assignments:', countError);
    return [];
  }
  
  // If no assignments have been generated for the user today, create them.
  if (assignmentsGeneratedCount === 0) {
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
    
    // If limit is 0, no need to do anything else.
    if (assignmentLimit === 0) {
        return [];
    }

    // 2. Get all accounts assigned to *any* user today to ensure no duplicates
    const { data: allTodayAssignments, error: allTodayError } = await supabase
      .from('daily_assignments')
      .select('instagram_id')
      .eq('assignment_date', today);
      
    if (allTodayError) {
      console.error("Error fetching all of today's assignments:", allTodayError);
      return [];
    }
    const assignedTodayIds = new Set(allTodayAssignments.map((a) => a.instagram_id));

    // 3. Get available accounts from the sheet and filter out assigned ones
    const allAccounts = await getAvailableAccounts();
    if (!allAccounts || allAccounts.length === 0) {
      return [];
    }
    
    const unassignedAccounts = allAccounts.filter((acc) => !assignedTodayIds.has(acc.id));
    const newTasksToAssign = unassignedAccounts.slice(0, assignmentLimit);

    // 4. Insert new assignments into the database
    if (newTasksToAssign.length > 0) {
      const newAssignmentRecords = newTasksToAssign.map((task) => ({
        user_id: userId,
        instagram_id: task.id,
        assignment_date: today,
      }));

      const { error: insertError } = await supabase
        .from('daily_assignments')
        .insert(newAssignmentRecords)
        .select();

      if (insertError) {
        console.error('Error saving new assignments:', insertError);
        // If insertion fails, return an empty array as no tasks were successfully assigned.
        return [];
      }
    }
  }

  // --- This part runs on EVERY load, including after initial creation ---

  // 1. Fetch the ACTIVE (not deleted) assignments for the user for today.
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
  
  if (activeAssignments.length === 0) {
    return [];
  }

  // 2. Fetch details for the active assignments from the sheet
  const activeAssignedIds = new Set(activeAssignments.map((a) => a.instagram_id));
  const allAccounts = await getAvailableAccounts();

  if (!allAccounts || allAccounts.length === 0) {
    return [];
  }
  
  const idToAccountMap = new Map(allAccounts.map(acc => [acc.id, acc]));
  
  // 3. Combine db data with sheet data
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
