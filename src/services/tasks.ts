
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { updateSubscriptionStatus as updateSheetSubscription } from './google-sheets';

/**
 * Creates a new subscription record and deletes the task from the daily assignments.
 * Also updates the Google Sheet.
 * @param userId The ID of the user subscribing.
 * @param instagramId The ID of the Instagram account being subscribed to.
 * @param assignmentId The ID of the assignment record in the daily_assignments table.
 * @param rowNumber The row number in the Google Sheet to update.
 */
export async function markTaskAsSubscribed(
  userId: string,
  instagramId: string,
  assignmentId: number,
  rowNumber: number
) {
  const supabase = createClient();

  // 1. Update the Google Sheet first
  const sheetSuccess = await updateSheetSubscription(rowNumber, true);
  if (!sheetSuccess) {
    return { error: { message: 'Failed to update the Google Sheet.' } };
  }

  // 2. Create a new record in the subscriptions table
  const { error: insertError } = await supabase
    .from('subscriptions')
    .insert({ user_id: userId, instagram_id: instagramId });

  if (insertError) {
    // If the database insert fails, revert the sheet change and return the error.
    await updateSheetSubscription(rowNumber, false); // Attempt to revert
    // This could be a duplicate subscription attempt, which is not an error.
    if (insertError.code === '23505') { // unique_violation
        // Still need to remove the task from the daily assignments.
    } else {
        return { error: { message: `Database error: ${insertError.message}` }};
    }
  }
  
  // 3. Delete the task from the daily assignments table, as it is now complete.
  const { error: deleteError } = await supabase
    .from('daily_assignments')
    .delete()
    .eq('id', assignmentId);

  if (deleteError) {
      // This is a more critical error. We should inform the user.
      // The subscription is recorded, but the task remains in their list.
      return { error: { message: `Failed to remove task from list: ${deleteError.message}`}};
  }


  revalidatePath('/'); // Revalidate the member's dashboard
  revalidatePath('/admin/users'); // Revalidate admin stats
  return { error: null };
}
