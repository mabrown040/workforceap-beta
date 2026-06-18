import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { withTenantScope } from '@/lib/tenant/withTenantScope';
import { getSubjectOrganizationId } from "@/lib/tenant/organization";
import { withApiGuc } from '@/lib/db/withRequestGuc';

import {
  getOrCreateMemberCounselorThread,
  assertStaffCanAccessThread,
  assertStaffCanPost,
  compactStringIds,
  getMessageAuthorName,
  normalizeMessageBody,
  serializeMessage,
} from '@/lib/messages/counselorThread';
import { createNotification } from '@/lib/notifications/create';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

/**
 * Track A — Tenant Isolation Hardening (Sprint A.2 batch 5).
 * See `docs/PROGRAM-ENTERPRISE-GRADE.md` and `docs/TENANT-ISOLATION.md`.
 *
 * Every member-existence check goes through `withTenantScope` so an
 * Org A admin/counselor cannot read or post into a thread for an Org B
 * member by guessing the memberId. `Message`, `MessageThread`, and the
 * author-name lookup all inherit tenancy via FK to `User`. The author
 * `findMany` is also scoped — it returns Org A names only, so a leaked
 * authorId from another tenant would resolve to "User" instead of
 * exposing the foreign tenant's user.
 */

type Props = { params: Promise<{ memberId: string }> };

async function canUseCounselorMessaging(userId: string): Promise<boolean> {
  if (await isAdmin(userId)) return true;
  return isCounselor(userId);
}async function _GET(_request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canUseCounselorMessaging(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const orgId = await getSubjectOrganizationId(memberId);

  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, fullName: true },
    }),
  );
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const access = await assertStaffCanAccessThread(user.id, thread.id);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const messages = await prisma.$transaction((tx) => tx.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
    take: 500,
  }));

  const names = await withTenantScope(orgId, (db) =>
    db.user.findMany({
      where: { id: { in: compactStringIds(messages.map((m) => m.authorId)) } },
      select: { id: true, fullName: true },
      take: 100,
    }),
  );
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
    console.error('/counselor/members/[memberId]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canUseCounselorMessaging(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;

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

  const orgId = await getSubjectOrganizationId(memberId);
  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true },
    }),
  );
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

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

  void createNotification({
    userId: memberId,
    type: 'message',
    title: 'New message from your advisor',
    body: normalized.body.slice(0, 200),
    data: { threadId: thread.id, authorId: user.id },
  });

  void auditLog({ actorUserId: user.id, action: 'counselor_message_sent', targetType: 'User', targetId: memberId, metadata: {} }).catch(() => {});
  logAuditEvent({ user: { id: user.id, role: 'counselor' }, verb: 'created', object: { type: 'Message', id: memberId }, result: { success: true } }).catch(() => {});
  return NextResponse.json({ message: serializeMessage(msg) });

  } catch (error) {
    console.error('/counselor/members/[memberId]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _PATCH(_request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await canUseCounselorMessaging(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const orgId = await getSubjectOrganizationId(memberId);

  const member = await withTenantScope(orgId, (db) =>
    db.user.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true },
    }),
  );
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
    console.error('/counselor/members/[memberId]/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

