import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { cookies } from 'next/headers';
import { getAdminMfaTrustCookieName, verifyAdminMfaTrustToken } from '@/lib/auth/mfaTrust';
import { prisma } from '@/lib/db/prisma';
import { isStaffMfaEnforcementEnabled } from '@/lib/auth/mfaConfig';

/**
 * GET /api/auth/check-mfa-required
 * Returns whether the current session needs MFA verification.
 * Used by the verify-mfa page to guard access.
 */
export async function GET(request: Request) {
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
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { role: true },
      });

      const isStaff =
        profile?.role === 'super_admin' ||
        profile?.role === 'admin' ||
        profile?.role === 'counselor';

      if (isStaff) {
        const trustedDevice = await verifyAdminMfaTrustToken({
          token: cookieStore.get(getAdminMfaTrustCookieName())?.value,
          userId: user.id,
          userAgent: request.headers.get('user-agent'),
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
}
