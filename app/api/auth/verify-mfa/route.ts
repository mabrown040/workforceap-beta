import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { cookies } from 'next/headers';
import {
  getAdminMfaTrustCookieName,
  getAdminMfaTrustCookieOptions,
  issueAdminMfaTrustToken,
} from '@/lib/auth/mfaTrust';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';

/**
 * POST /api/auth/verify-mfa
 * Verifies TOTP code after initial password login.
 * Expects: { code: string } in body.
 * Requires active session with aal1 (from password login).
 */
export async function POST(request: Request) {
  if (!isStaffMfaEnforcementEnabled()) {
    return NextResponse.json({ error: 'MFA verification is currently disabled.' }, { status: 404 });
  }

  const body: { code?: string; trustDevice?: boolean } = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const trustDevice = body.trustDevice !== false;

  if (!code || code.length < 6) {
    return NextResponse.json({ error: 'Please enter your 6-digit verification code.' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieOpts = getSupabaseCookieOptions(false);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieOpts,
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]);
          });
        },
      },
    }
  );

  // Check AAL level
  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    return NextResponse.json({ error: 'Session expired. Please sign in again.' }, { status: 401 });
  }

  // Must be at aal1 (password verified) needing aal2
  if (aalData.currentLevel !== 'aal1' || aalData.nextLevel !== 'aal2') {
    return NextResponse.json({ error: 'No MFA required or session invalid.' }, { status: 400 });
  }

  // Get enrolled TOTP factor
  const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError || !factorsData.totp.length) {
    return NextResponse.json({ error: 'No MFA factor found. Please set up 2FA first.' }, { status: 400 });
  }

  const factor = factorsData.totp[0];

  // Create challenge
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
  if (challengeError || !challengeData) {
    return NextResponse.json({ error: 'Failed to create MFA challenge. Try again.' }, { status: 500 });
  }

  // Verify code
  const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) {
    return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 401 });
  }

  if (trustDevice) {
    const token = await issueAdminMfaTrustToken({
      userId: verifyData.user.id,
      userAgent: request.headers.get('user-agent'),
    });

    cookieStore.set(getAdminMfaTrustCookieName(), token, getAdminMfaTrustCookieOptions());
  } else {
    cookieStore.set(getAdminMfaTrustCookieName(), '', {
      ...getAdminMfaTrustCookieOptions(),
      maxAge: 0,
    });
  }

  // Success — session now has aal2
  return NextResponse.json({ ok: true, aal: 'aal2' });
}
