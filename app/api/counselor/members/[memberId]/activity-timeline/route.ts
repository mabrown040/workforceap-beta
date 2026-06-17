import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { assertStaffCanAccessMemberRecord } from '@/lib/counselor/staffMemberAccess';

import { withApiGuc } from '@/lib/db/withRequestGuc';
export const GET = withApiGuc(async (
  req: Request,
  { params }: { params: Promise<{ memberId: string }> }
) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdminUser = await isAdmin(user.id);
    const isCounselorUser = await isCounselor(user.id);
    if (!isAdminUser && !isCounselorUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { memberId } = await params;

    // Verify access (admins can access any member; counselors only their assignments)
    const canAccess = await assertStaffCanAccessMemberRecord(user.id, memberId);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);

    const events = await prisma.$transaction((tx) => tx.memberEvent.findMany({
      where: { userId: memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventName: true,
        sourcePage: true,
        metadata: true,
        createdAt: true,
      },
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[counselor/members/activity-timeline] Failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity timeline' },
      { status: 500 }
    );
  }
});
