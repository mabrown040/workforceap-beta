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
    where: { id: threadId },
    include: {
      member: { select: { id: true, fullName: true, email: true, deletedAt: true } },
      employer: { select: { id: true, companyName: true, contactEmail: true, userId: true } },
      partner: {
        select: {
          id: true,
          name: true,
          partnerUsers: { select: { userId: true } },
        },
      },
      counselor: { select: { id: true, fullName: true } },
    },
  });

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  if (thread.kind === 'member' && thread.member?.deletedAt) {
    return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
  }

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
    thread.kind === 'member' && thread.memberId
      ? prisma.counselorAssignment.findFirst({
          where: { memberId: thread.memberId, active: true },
          select: { counselor: { select: { userId: true } } },
        })
      : Promise.resolve(null),
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

  const slaMap = thread.kind === 'member' ? await getSlaStatusForThreads([thread.id]) : new Map();
  const sla = slaMap.get(thread.id);

  const counselors = counselorRows.map((c) => ({
    userId: c.user.id,
    fullName: c.user.fullName,
    partnerName: c.partner?.name ?? 'WorkforceAP',
  }));

  if (thread.kind === 'member' && thread.member) {
    return NextResponse.json({
      kind: 'member' as const,
      thread: {
        id: thread.id,
        memberId: thread.memberId,
        counselorUserId: thread.counselorUserId,
        memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
        counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
        updatedAt: thread.updatedAt.toISOString(),
      },
      member: { id: thread.member.id, fullName: thread.member.fullName, email: thread.member.email },
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
      readOnlyNote:
        'View all messages and assign counselors. Counselors can reply from the member detail page.',
    });
  }

  if (thread.kind === 'employer' && thread.employer) {
    const portalUid = thread.employer.userId;
    return NextResponse.json({
      kind: 'employer' as const,
      thread: {
        id: thread.id,
        employerId: thread.employerId,
        portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
        staffLastReadAt: thread.staffLastReadAt?.toISOString() ?? null,
        staffUserId: thread.staffUserId,
        updatedAt: thread.updatedAt.toISOString(),
      },
      employer: {
        id: thread.employer.id,
        companyName: thread.employer.companyName,
        contactEmail: thread.employer.contactEmail,
      },
      messages: messages.map((m) => ({
        ...serializeMessage(m),
        authorName: nameById.get(m.authorId) ?? 'User',
        isFromPortalUser: m.authorId === portalUid,
      })),
      sla: null,
      readOnlyNote: 'Reply below. Messages sync to the employer portal in real time.',
    });
  }

  if (thread.kind === 'partner' && thread.partner) {
    const partnerUserIds = new Set(thread.partner.partnerUsers.map((p) => p.userId));
    return NextResponse.json({
      kind: 'partner' as const,
      thread: {
        id: thread.id,
        partnerId: thread.partnerId,
        portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
        staffLastReadAt: thread.staffLastReadAt?.toISOString() ?? null,
        staffUserId: thread.staffUserId,
        updatedAt: thread.updatedAt.toISOString(),
      },
      partner: {
        id: thread.partner.id,
        name: thread.partner.name,
      },
      messages: messages.map((m) => ({
        ...serializeMessage(m),
        authorName: nameById.get(m.authorId) ?? 'User',
        isFromPortalUser: partnerUserIds.has(m.authorId),
      })),
      sla: null,
      readOnlyNote: 'Reply below. Messages sync to the partner portal in real time.',
    });
  }

  return NextResponse.json({ error: 'Invalid thread' }, { status: 400 });
}
