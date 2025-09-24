// This file is separate from admin.ts to avoid 'use server' constraints on a sync function.
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client with admin privileges.
 * This should only be used in server-side code.
 * It uses the SERVICE_ROLE_KEY, which must be kept secret.
 */
export function createAdminClient() {
  // Pass the service role key from environment variables.
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
