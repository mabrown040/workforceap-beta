import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses cookies for session management. Requires middleware for session refresh.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days persistent
        sameSite: 'lax',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const opts = options as { path?: string; maxAge?: number; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; httpOnly?: boolean } | undefined;
              cookieStore.set(name, value, opts ?? {});
            });
          } catch (err) {
            console.error('Supabase setAll cookies error:', err);
          }
        },
      },
    }
  );
}

/**
 * Gets the current session from the server. Returns null if not authenticated.
 */
export async function getSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Gets the current user from the server. Returns null if not authenticated.
 * Prefer getSession() when you need the full session; use this for user-only checks.
 * Request-level memoization avoids duplicate Supabase round-trips when layout + page both call getUser().
 */
export const getUser = cache(async function getUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
