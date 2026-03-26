import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { serializeMessage } from '@/lib/messages/counselorThread';
import { getSlaStatusForThreads } from '@/lib/messages/superAdminMessageQueries';

type Props = { params: Promise<{ threadId: string }> };

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { threadId } = await params;

  const thread = await prisma.messageThread.findFirst({
    where: { id: threadId, member: { deletedAt: null } },
    include: {
      member: { select: { id: true, fullName: true, email: true } },
      counselor: { select: { id: true, fullName: true } },
    },
  });

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });

  const [counselorRows, activeCounselorAssignment] = await Promise.all([
    prisma.counselor.findMany({
      where: { active: true },
      orderBy: [{ partner: { name: 'asc' } }, { user: { fullName: 'asc' } }],
      select: {
        userId: true,
        user: { select: { id: true, fullName: true } },
        partner: { select: { name: true } },
      },
    }),
    prisma.counselorAssignment.findFirst({
      where: { memberId: thread.memberId, active: true },
      select: { counselor: { select: { userId: true } } },
    }),
  ]);

  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

  const authorIds = [...new Set(messages.map((m) => m.authorId))];
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, fullName: true },
  });
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));

  const slaMap = await getSlaStatusForThreads([thread.id]);
  const sla = slaMap.get(thread.id);

  const counselors = counselorRows.map((c) => ({
    userId: c.user.id,
    fullName: c.user.fullName,
    partnerName: c.partner.name,
  }));

  return NextResponse.json({
    thread: {
      id: thread.id,
      memberId: thread.memberId,
      counselorUserId: thread.counselorUserId,
      memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
      counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
      updatedAt: thread.updatedAt.toISOString(),
    },
    member: thread.member,
    counselorName: thread.counselor?.fullName ?? null,
    counselors,
    currentCounselorUserId: activeCounselorAssignment?.counselor.userId ?? thread.counselorUserId,
    messages: messages.map((m) => ({
      ...serializeMessage(m),
      authorName: nameById.get(m.authorId) ?? 'User',
      isFromMember: m.authorId === thread.memberId,
    })),
    sla: sla
      ? {
          needsCounselorReply: sla.needsCounselorReply,
          memberLastMessageAt: sla.memberLastMessageAt?.toISOString() ?? null,
          breached48h: sla.breached48h,
          breached72h: sla.breached72h,
        }
      : null,
    readOnlyNote: 'View all messages and assign counselors. Counselors can reply from the member detail page.',
  });
}
