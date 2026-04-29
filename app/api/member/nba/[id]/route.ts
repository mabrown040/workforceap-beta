import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

/** PATCH /api/member/nba/:id — update a DB-sourced next best action */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    await prisma.memberNextBestAction.update({
      where: { id, memberId: user.id },
      data: { status: nextStatus },
    });

    if (nextStatus === 'COMPLETED') {
      await prisma.memberEvent.create({
        data: {
          userId: user.id,
          eventName: 'member_next_best_action_clicked',
          entityType: 'MemberNextBestAction',
          entityId: id,
          sourcePage: '/dashboard',
        },
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Row not found or not owned by this user — silently OK from the client's perspective
    return NextResponse.json({ ok: true });
  }
}
