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
    readOnlyNote: 'Super admin oversight is read-only. Counselors reply from the member record.',
  });
}
