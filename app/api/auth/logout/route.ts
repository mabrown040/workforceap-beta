import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName } from '@/lib/auth/mfaTrust';

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

    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();

    // Clear the session-only preference flag on logout
    const cookieStore = await cookies();
    cookieStore.set(SESSION_ONLY_COOKIE, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });

    cookieStore.set(getAdminMfaTrustCookieName(), '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[auth/logout] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
