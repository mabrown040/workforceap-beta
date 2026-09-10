import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName } from '@/lib/auth/mfaTrust';
import { logger } from '@/lib/observability/logger';
import { isSupabaseAuthTokenCookieName } from '@/lib/auth/supabaseAuthCookie';

export async function POST(request: Request) {
  try {
    // CSRF guard: when an Origin header is present, require its host to
    // match the request's Host header. This is the textbook same-origin
    // check — independent of NEXT_PUBLIC_SITE_URL, so it works under any
    // deploy URL (apex vs www, preview vs prod, custom domains).
    // Missing Origin is allowed: same-origin POSTs from older browsers
    // and same-origin fetches via SameSite=Lax cookies often omit it,
    // and a CSRF attacker cannot suppress Origin in a cross-site context.
    const origin = request.headers.get('origin');
    if (origin) {
      const host = request.headers.get('host');
      try {
        const originHost = new URL(origin).host;
        if (!host || originHost !== host) {
          return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
      }
    }

    const cookieStore = await cookies();
    const cookieNames = new Set(cookieStore.getAll().map(({ name }) => name));
    let globalSignOut = false;
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.signOut();
      globalSignOut = !error;
      if (error) logger.error('[auth/logout] Provider sign-out failed; clearing local session');
    } catch {
      logger.error('[auth/logout] Provider sign-out unavailable; clearing local session');
    }

    // auth-js can return an error before removing local session storage. Clear
    // both original and newly refreshed chunks regardless of provider status.
    for (const { name } of cookieStore.getAll()) cookieNames.add(name);
    cookieNames.add(SESSION_ONLY_COOKIE);
    cookieNames.add(getAdminMfaTrustCookieName());
    for (const name of cookieNames) {
      if (!isSupabaseAuthTokenCookieName(name) &&
          !/^sb-[a-z0-9]+-auth-token-code-verifier(?:\.\d+)?$/i.test(name) &&
          name !== SESSION_ONLY_COOKIE && name !== getAdminMfaTrustCookieName()) continue;
      cookieStore.set(name, '', {
        path: '/', maxAge: 0, sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', httpOnly: true,
      });
    }

    return NextResponse.json({ success: true, globalSignOut }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    logger.error('[auth/logout] error', { err: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
