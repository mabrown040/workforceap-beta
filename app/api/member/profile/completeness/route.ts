import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';

const PROFILE_FIELDS = [
  'address',
  'city',
  'state',
  'zip',
  'profilePhone',
  'profileLinkedin',
  'profileBio',
  'dob',
  'veteranStatus',
  'employmentStatus',
  'educationLevel',
  'householdIncome',
  'referralSource',
  'usCitizen',
  'authorizedToWork',
  'hasDisability',
  'ethnicity',
  'employmentStatusAtEnroll',
  'financialAidInterest',
] as const;

const USER_FIELDS = ['email', 'fullName', 'phone'] as const;export const GET = withApiGuc(async () => {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await prisma.$transaction((tx) => tx.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    }));
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const missing: string[] = [];
    let filled = 0;
    let total = 0;

    for (const field of USER_FIELDS) {
      total++;
      const value = dbUser[field as keyof typeof dbUser];
      if (value !== null && value !== undefined && value !== '') {
        filled++;
      } else {
        missing.push(field);
      }
    }

    for (const field of PROFILE_FIELDS) {
      total++;
      const value = dbUser.profile?.[field as keyof typeof dbUser.profile];
      if (value !== null && value !== undefined && value !== '') {
        filled++;
      } else {
        missing.push(field);
      }
    }

    const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

    return NextResponse.json({
      percentage,
      filled,
      total,
      missing,
      isComplete: percentage === 100,
    });
  } catch (error) {
    console.error('/member/profile/completeness error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
