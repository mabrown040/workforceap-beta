import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCookieOptions, SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { runWithGucContext, buildGucContext, ANONYMOUS_GUC_CONTEXT } from '@/lib/db/gucContext';
import type { GucContext } from '@/lib/db/gucContext';
import { getProfileRole } from './roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';

export function hasSupabaseServerEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses cookies for session management. Requires middleware for session refresh.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!hasSupabaseServerEnv() || !url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
  }

  // Preserve "session only" preference across server-side token refreshes
  const sessionOnly = cookieStore.get(SESSION_ONLY_COOKIE)?.value === '1';

  return createServerClient(
    url,
    anonKey,
    {
      cookieOptions: getSupabaseCookieOptions(sessionOnly),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (sessionOnly) {
                // Strip maxAge/expires to keep the session ephemeral
                const { maxAge: _1, expires: _2, ...rest } = (options ?? {}) as Record<string, unknown>;
                const opts = rest as { path?: string; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; httpOnly?: boolean } | undefined;
                cookieStore.set(name, value, opts ?? {});
              } else {
                const opts = options as { path?: string; maxAge?: number; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none'; httpOnly?: boolean } | undefined;
                cookieStore.set(name, value, opts ?? {});
              }
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
  if (!hasSupabaseServerEnv()) return null;
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
  if (!hasSupabaseServerEnv()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Resolve the GUC context for the current request.
 *
 * - Authenticated: reads the Supabase user, resolves the profile role from
 *   the database, and builds a GucContext with `userId` + `role`.
 * - Unauthenticated: returns `ANONYMOUS_GUC_CONTEXT`.
 *
 * Uses React `cache()` so multiple calls in the same request share one DB
 * round-trip for the profile role.
 */
export const resolveAuthGucContext = cache(async function resolveAuthGucContext(): Promise<GucContext> {
  const user = await getUser();
  if (!user) return ANONYMOUS_GUC_CONTEXT;
  // orgId must be populated: the RLS policies for tenant-scoped tables
  // (users/profiles/placements/jobs/organizations) compare row org to
  // get_current_org_id() — without orgId here, every authenticated API
  // call evaluated under the policies is denied. Same fix as
  // app/layout.tsx for the SSR side. Defensive .catch so a transient
  // lookup failure falls back to an org-less context rather than
  // 500'ing the route.
  const [profileRole, orgId] = await Promise.all([
    getProfileRole(user.id),
    getActorOrganizationId(user.id).catch(() => null),
  ]);
  return buildGucContext({
    userId: user.id,
    orgId,
    profileRole,
  });
});

/**
 * Run `fn` with the GUC context derived from the current authenticated user.
 *
 * Use this in API routes, server actions, or server components where you
 * want every Prisma query inside `fn` to carry the correct RLS credentials.
 *
 * Example (API route):
 *   export const GET = withAuthGuc(async () => {
 *     const data = await prisma.member.findMany();
 *     return Response.json(data);
 *   });
 */
export function withAuthGuc<T>(fn: () => Promise<T>): Promise<T> {
  return resolveAuthGucContext().then((ctx) => runWithGucContext(ctx, fn));
}
