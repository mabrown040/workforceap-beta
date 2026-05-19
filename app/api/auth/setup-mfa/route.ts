import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { cookies } from 'next/headers';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { apiError } from '@/lib/http/errorResponse';
import { getSupabaseEnv } from '@/lib/supabase/env';

import { withRouteObservability } from '@/lib/api/routeObservability';async function _POST(request: Request) {
  try {
  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkAuthRateLimit(`setup-mfa:${ip}`);
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  if (!isStaffMfaEnforcementEnabled()) {
    return NextResponse.json({ error: 'MFA setup is currently disabled.' }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cookieOpts = getSupabaseCookieOptions(false);

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  if (factorsData?.totp?.length) {
    return NextResponse.json({ error: 'MFA already enrolled.' }, { status: 400 });
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'WorkforceAP Authenticator',
  });

  if (error || !data) {
    // Don't echo Supabase's raw error text — it leaks provider-specific
    // phrasing that can aid enumeration of factor state.
    return apiError(error ?? new Error('mfa.enroll returned no data'), {
      route: 'auth/setup-mfa',
      message: 'Failed to start MFA enrollment.',
    });
  }

  return NextResponse.json(
    { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  } catch (error) {
    console.error('/auth/setup-mfa error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withRouteObservability(_POST);async function _PATCH(request: Request) {
  try {
  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkAuthRateLimit(`setup-mfa:${ip}`);
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  if (!isStaffMfaEnforcementEnabled()) {
    return NextResponse.json({ error: 'MFA setup is currently disabled.' }, { status: 404 });
  }

  const body: { factorId?: string; code?: string } = await request.json().catch(() => ({}));
  const factorId = typeof body.factorId === 'string' ? body.factorId : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';

  if (!factorId || !code) {
    return NextResponse.json({ error: 'Factor ID and code are required.' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieOpts = getSupabaseCookieOptions(false);

  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseEnv();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challengeData) {
    return NextResponse.json({ error: 'Failed to create challenge.' }, { status: 500 });
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });

  if (verifyError) {
    return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, message: 'MFA enabled successfully.' }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error) {
    console.error('/auth/setup-mfa error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withRouteObservability(_PATCH);

