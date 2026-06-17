import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { auditLog } from '@/lib/audit';

import {
  getOrCreateMemberCounselorThread,
  assertStaffCanAccessThread,
  assertStaffCanPost,
  compactStringIds,
  getMessageAuthorName,
  normalizeMessageBody,
  serializeMessage,
} from '@/lib/messages/counselorThread';

type Props = { params: Promise<{ id: string }> };async function _GET(_request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const orgId = await getActorOrganizationId(user.id);

  const member = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: memberId, deletedAt: null, organizationId: orgId },
    select: { id: true, fullName: true },
  }));
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const access = await assertStaffCanAccessThread(user.id, thread.id);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const messages = await prisma.$transaction((tx) => tx.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
    take: 500,
  }));

  const names = await prisma.user.findMany({
    where: { id: { in: compactStringIds(messages.map((m) => m.authorId)) } },
    select: { id: true, fullName: true },
    take: 100,
  });
  const nameById = new Map(names.map((n) => [n.id, n.fullName]));

  return NextResponse.json({
    member: { id: member.id, fullName: member.fullName },
    thread: {
      id: thread.id,
      memberId: thread.memberId,
      counselorUserId: thread.counselorUserId,
      memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
      counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
    },
    messages: messages.map((m) => ({
      ...serializeMessage(m),
      authorName: getMessageAuthorName(nameById, m.authorId),
    })),
  });

  } catch (error) {
    console.error('/admin/members/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const orgId = await getActorOrganizationId(user.id);

  const member = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: memberId, deletedAt: null, organizationId: orgId },
    select: { id: true },
  }));
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const text = typeof (body as { body?: unknown }).body === 'string' ? (body as { body: string }).body : '';
  const normalized = normalizeMessageBody(text);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const canPost = await assertStaffCanPost(user.id, thread.id);
  if (!canPost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const msg = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        body: normalized.body,
      },
    });
    await tx.messageThread.update({
      where: { id: thread.id },
      data: {
        updatedAt: new Date(),
        counselorUserId: thread.counselorUserId ?? user.id,
      },
    });
    return m;
  });

  void auditLog({ actorUserId: user.id, action: 'admin_member_message_send', targetType: 'user', targetId: memberId, metadata: { messageId: msg.id } }).catch(() => {});
  return NextResponse.json({ message: serializeMessage(msg) });

  } catch (error) {
    console.error('/admin/members/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _PATCH(_request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: memberId } = await params;
  const orgId = await getActorOrganizationId(user.id);

  const member = await prisma.$transaction((tx) => tx.user.findFirst({
    where: { id: memberId, deletedAt: null, organizationId: orgId },
    select: { id: true },
  }));
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const access = await assertStaffCanAccessThread(user.id, thread.id);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  await prisma.$transaction((tx) => tx.messageThread.update({
    where: { id: thread.id },
    data: {
      counselorLastReadAt: now,
      counselorUserId: thread.counselorUserId ?? user.id,
    },
  }));

  return NextResponse.json({ ok: true, counselorLastReadAt: now.toISOString() });

  } catch (error) {
    console.error('/admin/members/[id]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

