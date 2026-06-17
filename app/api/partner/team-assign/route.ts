import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async () => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await prisma.$transaction((tx) => tx.partnerUser.findMany({
    where: { partnerId: ctx.partnerId },
    take: 200,
    include: { user: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  }));

  return NextResponse.json({
    users: rows.map((r) => ({ id: r.userId, fullName: r.user.fullName, email: r.user.email })),
  });

  } catch (error) {
    console.error('/partner/team-assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

