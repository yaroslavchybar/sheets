'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';

export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Check if the user already has assignments for today in our database.
  // This is the source of truth.
  const { data: existingAssignments, error: existingError } = await supabase
    .from('daily_assignments')
    .select('instagram_id')
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (existingError) {
    console.error('Error fetching existing assignments:', existingError);
    return [];
  }

  // 2. If assignments already exist, fetch their details from the sheet and return them.
  // This is the most reliable way to ensure we show the correct, persisted tasks.
  if (existingAssignments.length > 0) {
    const allAccounts = await getAvailableAccounts();
    if (!allAccounts || allAccounts.length === 0) {
      return []; // Cannot get details if sheet is empty
    }

    const assignedIds = new Set(existingAssignments.map((a) => a.instagram_id));
    return allAccounts.filter((acc) => assignedIds.has(acc.id));
  }

  // 3. If no assignments exist, create new ones.
  // Get the assignment limit for this specific user.
  const { data: userRole, error: userRoleError } = await supabase
    .from('user_roles')
    .select('daily_assignments_limit')
    .eq('user_id', userId)
    .single();

  if (userRoleError || !userRole) {
    console.error('Error fetching user assignment limit:', userRoleError);
    return []; // Cannot proceed without the limit
  }
  const assignmentsPerMember = userRole.daily_assignments_limit;
  
  if (assignmentsPerMember === 0) {
    return []; // User is assigned 0 tasks
  }

  // Get all accounts from the sheet to choose from.
  const allAccounts = await getAvailableAccounts();
  if (!allAccounts || allAccounts.length === 0) {
    return [];
  }

  // Get all accounts assigned to *any* user today to ensure no duplicates are picked.
  const { data: allTodayAssignments, error: allTodayError } = await supabase
    .from('daily_assignments')
    .select('instagram_id')
    .eq('assignment_date', today);

  if (allTodayError) {
    console.error(
      "Error fetching all of today's assignments:",
      allTodayError
    );
    return [];
  }

  const assignedTodayIds = new Set(
    allTodayAssignments.map((a) => a.instagram_id)
  );

  // Filter out accounts that have already been assigned to someone today
  const unassignedAccounts = allAccounts.filter(
    (acc) => !assignedTodayIds.has(acc.id)
  );

  // Take the required number of accounts for the current user from the unassigned pool
  const newTasksForUser = unassignedAccounts.slice(0, assignmentsPerMember);

  if (newTasksForUser.length === 0) {
    return []; // No new tasks available to assign
  }

  // 4. Save the new assignments to the database
  const newAssignmentRecords = newTasksForUser.map((task) => ({
    user_id: userId,
    instagram_id: task.id,
    assignment_date: today,
  }));

  const { error: insertError } = await supabase
    .from('daily_assignments')
    .insert(newAssignmentRecords);

  if (insertError) {
    console.error('Error saving new assignments:', insertError);
    // Important: if the insert fails, we return an empty array to avoid showing tasks that aren't saved.
    return [];
  }

  return newTasksForUser;
}
