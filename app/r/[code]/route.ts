import { NextRequest, NextResponse } from 'next/server';
import { MEMBER_REFERRAL_COOKIE, isValidReferralCode, normalizeReferralCode } from '@/lib/member/referrals';

/**
 * Public referral entry point. A member shares /r/<code>; the visitor lands here,
 * we drop a 30-day httpOnly cookie, and forward them into the apply funnel. The
 * actual reward is granted later, at enrollment (see lib/member/referrals.ts).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const res = NextResponse.redirect(new URL('/apply', req.url));

  if (isValidReferralCode(code)) {
    res.cookies.set(MEMBER_REFERRAL_COOKIE, normalizeReferralCode(code), {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return res;
}
