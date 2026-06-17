import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const progress = await prisma.$transaction((tx) => tx.pathwayStepProgress.findMany({
    where: { userId: user.id },
    take: 500,
  }));
  const byPathway = progress.reduce((acc, p) => {
    if (!acc[p.pathwayId]) acc[p.pathwayId] = [];
    acc[p.pathwayId].push(p);
    return acc;
  }, {} as Record<string, typeof progress>);
  return NextResponse.json({ progress: byPathway });

  } catch (error) {
    console.error('/member/pathway-steps/progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

