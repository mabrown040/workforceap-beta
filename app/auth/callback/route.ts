import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { prisma } from '@/lib/db/prisma';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
import { resolveRoleAwarePostLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { trackEvent } from '@/lib/events/track';

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

      // Emit email_verified once per user. Must never block the auth response.
      if (userId) {
        try {
          const alreadyEmitted = await prisma.memberEvent.findFirst({
            where: { userId, eventName: 'email_verified' },
            select: { id: true },
          });
          if (!alreadyEmitted) {
            await trackEvent({
              userId,
              eventName: 'email_verified',
              sourcePage: '/auth/callback',
              metadata: {
                email: userData.user?.email ?? null,
                provider: userData.user?.app_metadata?.provider ?? null,
              },
            });
          }
        } catch (err) {
          console.error('[auth/callback] email_verified tracking failed', err);
        }
      }

      const destination = resolveRoleAwarePostLoginRedirect(safeNext, profile?.role);
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
