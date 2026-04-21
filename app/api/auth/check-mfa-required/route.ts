import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseCookieOptions } from '@/lib/supabaseCookieOptions';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/check-mfa-required
 * Returns whether the current session needs MFA verification.
 * Used by the verify-mfa page to guard access.
 */
export async function GET() {
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
  const mfaRequired = aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2';

  return NextResponse.json({
    mfaRequired,
    currentAal: aalData.currentLevel,
    nextAal: aalData.nextLevel,
  });
}
