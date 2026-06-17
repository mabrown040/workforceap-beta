import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { prisma } from '@/lib/db/prisma';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
import { resolveRoleAwarePostLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { emitEmailVerifiedFromCallback } from '@/lib/events/emailVerified';
import { trackEvent } from '@/lib/events/track';
import { logger } from '@/lib/observability/logger';

// Handles Supabase email confirmation and OAuth redirects.
// Supabase sends ?code=xxx (PKCE); we exchange it for a session then redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextRaw = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookieOptions: getSupabaseCookieOptions(),
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, (options ?? {}) as Record<string, unknown>);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const safeNext = sanitizeRedirectPath(nextRaw, '/dashboard');
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const profile = userId
        ? await prisma.profile.findUnique({
            where: { userId },
            select: { role: true },
          })
        : null;
      const destination = resolveRoleAwarePostLoginRedirect(safeNext, profile?.role);

      if (userId) {
        void emitEmailVerifiedFromCallback(userId, userData.user?.email ?? null);
        trackEvent({
          userId,
          eventName: 'member_logged_in',
          metadata: { destination },
          sourcePage: '/auth/callback',
        }).catch(() => {});

      await prisma.$transaction((tx) =>
        tx.user.update({
          where: { id: userId },
          data: { lastLoginAt: new Date() },
        }),
      ).catch((err) => {
        logger.warn('Failed to update lastLoginAt', { userId, err });
      });
      }

      try {
        const destPath = new URL(destination, 'https://internal.invalid').pathname;
        const redirectUrl =
          destPath === '/dashboard' ? `${origin}/dashboard?verified=1` : `${origin}${destination}`;
        return NextResponse.redirect(redirectUrl);
      } catch {
        return NextResponse.redirect(`${origin}/dashboard?verified=1`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
