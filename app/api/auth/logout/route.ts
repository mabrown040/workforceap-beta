import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName } from '@/lib/auth/mfaTrust';

export async function POST(request: Request) {
  try {
    // CSRF guard: reject cross-origin logout requests (AUDIT §H-S10).
    const origin = request.headers.get('origin');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (origin && siteUrl && !origin.startsWith(siteUrl)) {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
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
