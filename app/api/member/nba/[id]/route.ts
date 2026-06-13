import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const PATCH = withApiGuc(async (
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  let nextStatus: 'DISMISSED' | 'COMPLETED' = 'DISMISSED';
  try {
    const body = await req.json();
    if (body?.status === 'COMPLETED') nextStatus = 'COMPLETED';
  } catch {
    // Keep backward compatibility with dismiss-only callers.
  }

  try {
    if (nextStatus === 'COMPLETED') {
      const existing = await prisma.$transaction((tx) => tx.memberNextBestAction.findFirst({
        where: { id, memberId: user.id },
        select: { id: true },
      }));
      if (!existing) return NextResponse.json({ ok: true });

      await prisma.$transaction((tx) => tx.memberEvent.create({
        data: {
          userId: user.id,
          eventName: 'member_next_best_action_clicked',
          entityType: 'MemberNextBestAction',
          entityId: id,
          sourcePage: '/dashboard',
        },
      })).catch(() => {});
    } else {
      await prisma.$transaction((tx) => tx.memberNextBestAction.update({
        where: { id, memberId: user.id },
        data: { status: nextStatus },
      }));
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Row not found or not owned by this user — silently OK from the client's perspective
    return NextResponse.json({ ok: true });
  }

  } catch (error) {
    console.error('/member/nba/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

