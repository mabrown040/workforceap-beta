'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/supabase/env';

/**
 * Creates a Supabase client for Client Components.
 * Uses cookies for session persistence. Singleton in browser.
 */
export function createSupabaseBrowserClient() {
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days persistent
        sameSite: 'lax',
      },
    }
  );
}
