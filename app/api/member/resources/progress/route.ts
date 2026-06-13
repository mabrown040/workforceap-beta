import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const GET = withApiGuc(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const progress = await prisma.$transaction((tx) => tx.resourceProgress.findMany({
    where: { userId: user.id },
    take: 500,
  }));
  const byResource = Object.fromEntries(progress.map((p) => [p.resourceId, p]));
  return NextResponse.json({ progress: byResource });

  } catch (error) {
    console.error('/member/resources/progress error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

