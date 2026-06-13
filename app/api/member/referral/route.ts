import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateReferralCode } from '@/lib/member/referrals';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/** Returns (minting on first call) the member's referral code, share path, and rewarded count. */
export const GET = withApiGuc(async () => {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const code = await getOrCreateReferralCode(user.id);
  const rewardedCount = await prisma.referralConversion.count({
    where: { referrerUserId: user.id, status: 'rewarded' },
  });

  return NextResponse.json({ code, sharePath: `/r/${code}`, rewardedCount });
});
