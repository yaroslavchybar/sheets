'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';

export async function getDailyTasksForMember(
  userId: string
): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Get the assignment limit for this specific user
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

  // 2. Check if the user already has assignments for today
  const { data: existingAssignments, error: existingError } = await supabase
    .from('daily_assignments')
    .select('instagram_id')
    .eq('user_id', userId)
    .eq('assignment_date', today);

  if (existingError) {
    console.error('Error fetching existing assignments:', existingError);
    return [];
  }

  if (existingAssignments.length > 0) {
    // User already has tasks, fetch them using the stored IDs
    const allAccounts = await getAvailableAccounts();
    const assignedIds = new Set(existingAssignments.map((a) => a.instagram_id));
    return allAccounts.filter((acc) => assignedIds.has(acc.id));
  }

  // 3. If no assignments, create new ones
  // Get all accounts assigned to *any* user today
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

  const allAccounts = await getAvailableAccounts();
  const assignedTodayIds = new Set(
    allTodayAssignments.map((a) => a.instagram_id)
  );

  // Filter out already assigned accounts
  const unassignedAccounts = allAccounts.filter(
    (acc) => !assignedTodayIds.has(acc.id)
  );

  // Take the required number of accounts for the current user
  const newTasksForUser = unassignedAccounts.slice(0, assignmentsPerMember);

  if (newTasksForUser.length === 0) {
    return []; // No new tasks available
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
    return [];
  }

  return newTasksForUser;
}
