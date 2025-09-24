
'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

/**
 * Marks a task as subscribed. This function now uses the standard user client
 * because the RLS policies specifically allow this update.
 * @param userId The ID of the user subscribing.
 * @param instagramId The ID of the Instagram account being subscribed to.
 */
export async function markTaskAsSubscribed(
  userId: string,
  instagramId: string,
) {
  const supabase = createClient();
  const adminClient = createAdminClient();
  const subscribedAt = new Date().toISOString();

  // 1. Update the instagram_accounts table.
  // The RLS policy "Allow users to update status on their assigned accounts"
  // explicitly permits this action for the logged-in user.
  const { error: updateError } = await supabase
    .from('instagram_accounts')
    .update({
      status: 'subscribed',
      subscribed_at: subscribedAt,
      // No need to set assigned_to, RLS confirms it's the correct user
    })
    .eq('id', instagramId)
    .eq('assigned_to', userId);

  if (updateError) {
    return { error: { message: `Database error during account update: ${updateError.message}` }};
  }

  // 2. Call the database function to increment counts.
  // We use the ADMIN client for this RPC call to ensure it has permission to write
  // to the user_roles table, which is more secure.
  const { error: rpcError } = await adminClient.rpc('increment_subscription_counts', {
    p_user_id: userId,
  });

  if (rpcError) {
    console.error(`Failed to increment subscription counts for user ${userId}: ${rpcError.message}`);
  }

  revalidatePath('/');
  revalidatePath('/admin/users');
  return { error: null };
}


/**
 * Marks a task as skipped. This uses the standard user client as RLS allows this.
 * @param userId The ID of the user skipping.
 * @param instagramId The ID of the Instagram account being skipped.
 */
export async function markTaskAsSkipped(
  userId: string,
  instagramId: string,
) {
  const supabase = createClient();

  // The RLS policy "Allow users to update status on their assigned accounts"
  // explicitly permits this action for the logged-in user.
  const { error: updateError } = await supabase
    .from('instagram_accounts')
    .update({
      status: 'skip',
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
