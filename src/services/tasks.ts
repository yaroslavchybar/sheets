
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Marks a task as subscribed. This involves updating the instagram_accounts table.
 * @param userId The ID of the user subscribing.
 * @param instagramId The ID of the Instagram account being subscribed to.
 */
export async function markTaskAsSubscribed(
  userId: string,
  instagramId: string,
) {
  const supabase = createClient();
  const subscribedAt = new Date().toISOString();

  // Update the instagram_accounts table to mark the account as 'subscribed'.
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

  revalidatePath('/'); // Revalidate the member's dashboard
  revalidatePath('/admin/users'); // Revalidate admin stats
  return { error: null };
}
