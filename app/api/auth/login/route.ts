import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { normalizePostLoginRedirect, resolveRoleAwarePostLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { getSupabaseCookieOptions, SESSION_ONLY_COOKIE } from '@/lib/supabaseCookieOptions';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';
import { getAdminMfaTrustCookieName, verifyAdminMfaTrustToken } from '@/lib/auth/mfaTrust';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const POST = withApiGuc(async (request: Request) => {
  try {
  let body: { email?: string; password?: string; redirectTo?: string; rememberMe?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const rememberMe = body?.rememberMe === true; // defaults to false
  const redirectTo = normalizePostLoginRedirect(
    typeof body?.redirectTo === 'string' ? body.redirectTo : undefined,
    '/dashboard'
  );

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  // Rate limit by email to prevent brute-force
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimitKey = `login:${ip}:${email.toLowerCase()}`;
  const { success: withinLimit } = await checkAuthRateLimit(rateLimitKey);
  if (!withinLimit) {
    return NextResponse.json(
      {
        error:
          'Too many login attempts from this network. Please wait a minute before trying again, or reset your password if you are locked out.',
      },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  const cookieStore = await cookies();
  const cookieOpts = getSupabaseCookieOptions(!rememberMe); // sessionOnly = !rememberMe

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieOpts,
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = (options ?? {}) as Parameters<typeof cookieStore.set>[2];
            if (!rememberMe) {
              // Strip maxAge/expires so Supabase auth cookies stay session-only
              const { maxAge: _1, expires: _2, ...rest } = (opts ?? {}) as Record<string, unknown>;
              cookieStore.set(name, value, rest as Parameters<typeof cookieStore.set>[2]);
            } else {
              cookieStore.set(name, value, opts);
            }
          });
        },
      },
    }
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const msg = error.message ?? '';
    let friendly: string;
    if (/email not confirmed/i.test(msg)) {
      friendly =
        "Your email hasn’t been verified yet. Check your inbox for the verification link, or contact us at (512) 777-1808 for help.";
    } else if (/user.*disabled|account.*disabled|banned/i.test(msg)) {
      friendly =
        "Your account isn’t available. Contact us at (512) 777-1808 for help.";
    } else {
      friendly = msg || 'Incorrect email or password.';
    }
    return NextResponse.json({ error: friendly }, { status: 401 });
  }

  if (!data.session) {
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 401 });
  }

  // Persist the session-only flag so middleware never upgrades the cookie lifetime
  if (!rememberMe) {
    cookieStore.set(SESSION_ONLY_COOKIE, '1', {
      path: '/',
      // This flag cookie itself has no maxAge so it is also session-only
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });
  } else {
    // Clear the flag if the user previously had session-only and now chose to remember
    cookieStore.set(SESSION_ONLY_COOKIE, '', {
      path: '/',
      maxAge: 0,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
    });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: data.user.id },
    select: { role: true },
  });

  const staffMfaEnabled = isStaffMfaEnforcementEnabled();
  const aalData = staffMfaEnabled
    ? (await supabase.auth.mfa.getAuthenticatorAssuranceLevel()).data
    : null;
  const needsMfa = staffMfaEnabled && aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2';
  const isStaff = profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'counselor';
  const roleAwareRedirect = resolveRoleAwarePostLoginRedirect(redirectTo, profile?.role);

  // If staff and no MFA enrolled yet, redirect to setup
  if (staffMfaEnabled && isStaff && !needsMfa) {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (!factors?.totp?.length) {
      return NextResponse.json({ ok: true, mfaSetupRequired: true, redirectTo: `/setup-mfa?next=${encodeURIComponent(roleAwareRedirect)}` }, { headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // If MFA required (staff with factor enrolled), tell client to verify
  if (staffMfaEnabled && needsMfa && isStaff) {
    const trustedDevice = await verifyAdminMfaTrustToken({
      token: cookieStore.get(getAdminMfaTrustCookieName())?.value,
      userId: data.user.id,
      userAgent: request.headers.get('user-agent'),
    });

    if (trustedDevice) {
      if (request.headers.get('x-wap-login-flow') === 'client') {
        return NextResponse.json({ ok: true, redirectTo: roleAwareRedirect, mfaTrusted: true }, { headers: { 'Cache-Control': 'no-store' } });
      }

      return NextResponse.redirect(new URL(roleAwareRedirect, request.url), 302);
    }

    return NextResponse.json({ ok: true, mfaRequired: true, redirectTo: `/verify-mfa?next=${encodeURIComponent(roleAwareRedirect)}` }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const noStore = { 'Cache-Control': 'no-store' };
  if (request.headers.get('x-wap-login-flow') === 'client') {
    return NextResponse.json({ ok: true, redirectTo: roleAwareRedirect }, { headers: noStore });
  }

  return NextResponse.redirect(new URL(roleAwareRedirect, request.url), 302);

  } catch (error) {
    console.error('/auth/login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

