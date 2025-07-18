'use server';

import { createClient } from '@/lib/supabase/server';
import { getAvailableAccounts } from './google-sheets';
import type { InstagramAccount } from '@/lib/types';

export async function getDailyTasksForMember(userId: string): Promise<InstagramAccount[]> {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // 1. Get the number of assignments per member from settings
  const { data: settings, error: settingsError } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'daily_assignments_per_member')
    .single();

  if (settingsError || !settings) {
    console.error('Error fetching assignment settings:', settingsError);
    // Default to 10 if not set
    settings = { value: '10' };
  }
  const assignmentsPerMember = parseInt(settings.value, 10);

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
  
  const allAccounts = await getAvailableAccounts();
  if (existingAssignments.length > 0) {
    // User already has tasks, just return them from the full list
    const assignedIds = new Set(existingAssignments.map(a => a.instagram_id));
    return allAccounts.filter(acc => assignedIds.has(acc.id));
  }

  // 3. If no assignments, create new ones
  // Get all accounts assigned to *any* user today
  const { data: allTodayAssignments, error: allTodayError } = await supabase
    .from('daily_assignments')
    .select('instagram_id')
    .eq('assignment_date', today);

  if (allTodayError) {
    console.error('Error fetching all of today\'s assignments:', allTodayError);
    return [];
  }

  const assignedTodayIds = new Set(allTodayAssignments.map(a => a.instagram_id));
  
  // Filter out already assigned accounts
  const unassignedAccounts = allAccounts.filter(acc => !assignedTodayIds.has(acc.id));
  
  // Take the required number of accounts for the current user
  const newTasksForUser = unassignedAccounts.slice(0, assignmentsPerMember);

  if (newTasksForUser.length === 0) {
    return []; // No new tasks available
  }
  
  // 4. Save the new assignments to the database
  const newAssignmentRecords = newTasksForUser.map(task => ({
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
