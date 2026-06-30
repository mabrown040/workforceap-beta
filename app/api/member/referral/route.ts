import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateReferralCode } from '@/lib/member/referrals';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { withDbRetry } from '@/lib/db/withDbRetry';
import { logger } from '@/lib/observability/logger';

/** Returns (minting on first call) the member's referral code, share path, and rewarded count. */
export const GET = withApiGuc(async () => {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // get-or-create is idempotent, so retrying through a transient pooler blip
    // is safe; the count is a plain read. Without this an unhandled DB error
    // escaped as a raw 500 on the dashboard share UI.
    const code = await withDbRetry(() => getOrCreateReferralCode(user.id));
    const rewardedCount = await withDbRetry(() =>
      prisma.referralConversion.count({
        where: { referrerUserId: user.id, status: 'rewarded' },
      }),
    );
    return NextResponse.json({ code, sharePath: `/r/${code}`, rewardedCount });
  } catch (err) {
    logger.error('/member/referral error', { userId: user.id, err });
    return NextResponse.json(
      { error: 'Could not load your referral details right now. Please try again.' },
      { status: 500 },
    );
  }
});
