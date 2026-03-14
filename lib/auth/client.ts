'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for Client Components.
 * Uses cookies for session persistence. Singleton in browser.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
