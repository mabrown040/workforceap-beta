import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import {
  getOrCreateEmployerMessageThread,
  assertEmployerUserCanAccessThread,
} from '@/lib/messages/portalThreads';
import { normalizeMessageBody, serializeMessage } from '@/lib/messages/counselorThread';
import { checkMessageRateLimit } from '@/lib/messages/rateLimit';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);

  const messages = await prisma.$transaction((tx) => tx.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
    take: 500,
  }));

  return NextResponse.json({
    thread: {
      id: thread.id,
      kind: thread.kind,
      employerId: thread.employerId,
      portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
      staffLastReadAt: thread.staffLastReadAt?.toISOString() ?? null,
      staffUserId: thread.staffUserId,
    },
    messages: messages.map(serializeMessage),
  });

  } catch (error) {
    console.error('/employer/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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

  const rl = await checkMessageRateLimit(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many messages. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);
  const ok = await assertEmployerUserCanAccessThread(user.id, thread.id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
      data: { updatedAt: new Date() },
    });
    return m;
  });

  auditLog({
    actorUserId: user.id,
    action: 'employer_message_sent',
    targetType: 'Employer',
    targetId: ctx.employerId,
    metadata: { messageId: msg.id, threadId: thread.id },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'employer' },
    verb: 'sent',
    object: { type: 'EmployerMessage', id: msg.id },
    result: { success: true, extensions: { threadId: thread.id } },
  }).catch(() => {});

  return NextResponse.json({ message: serializeMessage(msg) });

  } catch (error) {
    console.error('/employer/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _PATCH() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);
  const ok = await assertEmployerUserCanAccessThread(user.id, thread.id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  await prisma.$transaction((tx) => tx.messageThread.update({
    where: { id: thread.id },
    data: { portalUserLastReadAt: now },
  }));

  return NextResponse.json({ ok: true, portalUserLastReadAt: now.toISOString() });

  } catch (error) {
    console.error('/employer/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

