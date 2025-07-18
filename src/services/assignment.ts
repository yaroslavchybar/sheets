'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';

export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Get the user's current assignment limit and existing assignments for today
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

  const { data: existingAssignments, error: existingError } = await supabase
    .from('daily_assignments')
    .select('id, instagram_id, created_at, is_subscribed, is_deleted')
    .eq('user_id', userId)
    .eq('assignment_date', today)
    .eq('is_deleted', false) // Only fetch non-deleted tasks
    .order('created_at', { ascending: true });

  if (existingError) {
    console.error('Error fetching existing assignments:', existingError);
    return [];
  }

  const currentTaskCount = existingAssignments.length;
  let finalAssignments = [...existingAssignments];

  // 2. Compare current task count with the limit and adjust if necessary
  if (currentTaskCount < assignmentLimit) {
    // --- HANDLE LIMIT INCREASE ---
    const needed = assignmentLimit - currentTaskCount;
    
    // Get all accounts assigned to *any* user today to ensure no duplicates
    const { data: allTodayAssignments, error: allTodayError } = await supabase
      .from('daily_assignments')
      .select('instagram_id')
      .eq('assignment_date', today);
      
    if (allTodayError) {
      console.error("Error fetching all of today's assignments:", allTodayError);
      return [];
    }
    const assignedTodayIds = new Set(allTodayAssignments.map((a) => a.instagram_id));

    const allAccounts = await getAvailableAccounts();
    if (!allAccounts || allAccounts.length === 0) {
      return [];
    }
    
    const unassignedAccounts = allAccounts.filter((acc) => !assignedTodayIds.has(acc.id));
    const newTasksToAssign = unassignedAccounts.slice(0, needed);

    if (newTasksToAssign.length > 0) {
      const newAssignmentRecords = newTasksToAssign.map((task) => ({
        user_id: userId,
        instagram_id: task.id,
        assignment_date: today,
      }));

      const { data: insertedAssignments, error: insertError } = await supabase
        .from('daily_assignments')
        .insert(newAssignmentRecords)
        .select('id, instagram_id, created_at, is_subscribed, is_deleted');

      if (insertError) {
        console.error('Error saving new assignments:', insertError);
      } else {
        finalAssignments.push(...insertedAssignments);
      }
    }
  } 

  // 3. If there are no assignments to process, return empty
  if (finalAssignments.length === 0) {
    return [];
  }

  // 4. Fetch details for the final list of assignments from the sheet
  const finalAssignedIds = new Set(finalAssignments.map((a) => a.instagram_id));
  const allAccounts = await getAvailableAccounts();

  if (!allAccounts || allAccounts.length === 0) {
    return [];
  }
  
  const idToAccountMap = new Map(allAccounts.map(acc => [acc.id, acc]));
  
  // Combine db data with sheet data
  const orderedTasks = finalAssignments
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
