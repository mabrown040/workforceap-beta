import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { getAdminMfaTrustCookieName } from '@/lib/auth/mfaTrust';

export async function POST() {
  try {
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[auth/logout] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
