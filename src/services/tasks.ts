
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { updateSubscriptionStatus as updateSheetSubscription } from './google-sheets';

/**
 * Marks a specific task as "subscribed" in both the database and Google Sheets.
 * Also marks the task as "deleted" to hide it from the UI.
 * @param assignmentId The ID of the assignment record in the daily_assignments table.
 * @param rowNumber The row number in the Google Sheet to update.
 * @param subscribed The new boolean value for the subscription status.
 */
export async function markTaskAsSubscribed(assignmentId: number, rowNumber: number, subscribed: boolean) {
  const supabase = createClient();
  
  // 1. Update the Google Sheet first
  const sheetSuccess = await updateSheetSubscription(rowNumber, subscribed);
  if (!sheetSuccess) {
    return { error: { message: 'Failed to update the Google Sheet.' } };
  }

  // 2. Update the Supabase database
  const { error } = await supabase
    .from('daily_assignments')
    .update({ is_subscribed: subscribed, is_deleted: true }) // Mark as deleted at the same time
    .eq('id', assignmentId);

  if (error) {
    // If the database update fails, we should ideally try to revert the sheet change.
    // For now, we'll just return the error.
    await updateSheetSubscription(rowNumber, !subscribed); // Attempt to revert
    return { error };
  }

  revalidatePath('/'); // Revalidate the member's dashboard
  return { error: null };
}

/**
 * Marks a specific task as "deleted" in the database.
 * This effectively hides it from the user's daily view.
 * @param assignmentId The ID of the assignment record in the daily_assignments table.
 */
export async function markTaskAsDeleted(assignmentId: number) {
  const supabase = createClient();

  const { error } = await supabase
    .from('daily_assignments')
    .update({ is_deleted: true })
    .eq('id', assignmentId);

  if (error) {
    return { error };
  }

  revalidatePath('/'); // Revalidate the member's dashboard to remove the task
  return { error: null };
}
