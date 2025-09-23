
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Marks a task as subscribed. This involves updating the instagram_accounts table
 * and calling a database function to increment user subscription counters.
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
  const { error: updateError } = await supabase
    .from('instagram_accounts')
    .update({
      status: 'subscribed',
      subscribed_at: subscribedAt,
      assigned_to: userId, // Ensure the user is stamped on subscription
    })
    .eq('id', instagramId)
    .eq('assigned_to', userId); // Ensure we only update a task assigned to this user.

  if (updateError) {
    return { error: { message: `Database error during account update: ${updateError.message}` }};
  }

  // 2. Call the database function to increment the user's subscription counts.
  const { error: rpcError } = await supabase.rpc('increment_subscription_counts', {
    p_user_id: userId,
  });

  if (rpcError) {
    // Note: At this point, the account is marked 'subscribed' but the count failed.
    // This is a situation that may require manual correction or more complex transaction logic.
    // For now, we'll just log the error.
    console.error(`Failed to increment subscription counts for user ${userId}: ${rpcError.message}`);
    // We don't return the error to the client because the primary action (subscribing) succeeded.
  }

  revalidatePath('/'); // Revalidate the member's dashboard
  revalidatePath('/admin/users'); // Revalidate admin stats
  return { error: null };
}


/**
 * Marks a task as skipped.
 * @param userId The ID of the user skipping.
 * @param instagramId The ID of the Instagram account being skipped.
 */
export async function markTaskAsSkipped(
  userId: string,
  instagramId: string,
) {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from('instagram_accounts')
    .update({
      status: 'skip',
      assigned_to: userId, // Keep a record of who skipped it
    })
    .eq('id', instagramId)
    .eq('assigned_to', userId);

  if (updateError) {
    return { error: { message: `Database error during update: ${updateError.message}` }};
  }

  revalidatePath('/');
  revalidatePath('/admin/users');
  return { error: null };
}
