import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { cookies } from 'next/headers';
import { getAdminMfaTrustCookieName, verifyAdminMfaTrustToken } from '@/lib/auth/mfaTrust';
import { prisma } from '@/lib/db/prisma';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';
import { checkAuthRateLimit } from '@/lib/rate-limit';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (request: Request) => {
  try {
  if (isReadOnlyPortalAuditHeader(request.headers)) {
    return NextResponse.json({
      mfaRequired: false,
      mfaEnforcement: true,
      currentAal: 'audit-suppressed',
      nextAal: 'audit-suppressed',
      auditSuppressed: true,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const ip = getClientIpFromRequest(request);
  const { success: withinLimit } = await checkAuthRateLimit(`check-mfa-required:${ip}`);
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  if (!isStaffMfaEnforcementEnabled()) {
    return NextResponse.json({
      mfaRequired: false,
      mfaEnforcement: false,
      reason: 'mfa_enforcement_disabled',
      currentAal: 'disabled',
      nextAal: 'disabled',
    });
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

  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError || !aalData) {
    return NextResponse.json({ mfaRequired: false, reason: 'no_session' }, { status: 401 });
  }

  // If at aal1 and next level is aal2, MFA is required
  let mfaRequired = aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2';

  if (mfaRequired) {
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;

    if (user) {
      // Must run inside $transaction — see app/api/auth/login/route.ts.
      // Callback form: array-form results were shifted by the injected GUC query.
      const profile = await prisma.$transaction((tx) =>
        tx.profile.findUnique({
          where: { userId: user.id },
          select: { role: true },
        }),
      );

      const isStaff =
        profile?.role === 'super_admin' ||
        profile?.role === 'admin' ||
        profile?.role === 'counselor';

      if (isStaff) {
        const trustedDevice = await verifyAdminMfaTrustToken({
          token: cookieStore.get(getAdminMfaTrustCookieName())?.value,
          userId: user.id,
          userAgent: request.headers.get('user-agent'),
          ip: getClientIpFromRequest(request),
        });

        if (trustedDevice) {
          mfaRequired = false;
        }
      }
    }
  }

  return NextResponse.json(
    { mfaRequired, mfaEnforcement: true, currentAal: aalData.currentLevel, nextAal: aalData.nextLevel },
    { headers: { 'Cache-Control': 'no-store' } }
  );

  } catch (error) {
    console.error('/auth/check-mfa-required error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

