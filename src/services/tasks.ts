
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Marks a task as subscribed. This involves updating the instagram_accounts table
 * and creating a historical record in the subscriptions table.
 * @param userId The ID of the user subscribing.
 * @param instagramId The ID of the Instagram account being subscribed to.
 */
export async function markTaskAsSubscribed(
  userId: string,
  instagramId: string,
) {
  const supabase = createClient();
  const subscribedAt = new Date().toISOString();

  // 1. Update the instagram_accounts table to mark the account as 'subscribed'.
  // This is the primary state change for the application logic.
  const { error: updateError } = await supabase
    .from('instagram_accounts')
    .update({
      status: 'subscribed',
      subscribed_at: subscribedAt,
    })
    .eq('id', instagramId)
    .eq('assigned_to', userId); // Ensure we only update a task assigned to this user.

  if (updateError) {
    return { error: { message: `Database error during update: ${updateError.message}` }};
  }

  // 2. Create a new record in the subscriptions table for historical tracking.
  const { error: insertError } = await supabase
    .from('subscriptions')
    .insert({ 
      user_id: userId, 
      instagram_id: instagramId,
      subscribed_at: subscribedAt 
    });

  if (insertError) {
    // If this fails, the main logic is done, but our history is incomplete.
    // This is less critical, but we should log it.
    console.error(`Failed to create history record for subscription: ${insertError.message}`);
    // We don't return an error to the user because their task list is correct.
  }

  revalidatePath('/'); // Revalidate the member's dashboard
  revalidatePath('/admin/users'); // Revalidate admin stats
  return { error: null };
}
