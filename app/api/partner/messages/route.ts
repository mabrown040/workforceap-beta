import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getPartnerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import {
  getOrCreatePartnerMessageThread,
  assertPartnerCanAccessThread,
} from '@/lib/messages/portalThreads';
import { normalizeMessageBody, serializeMessage } from '@/lib/messages/counselorThread';
import { checkMessageRateLimit } from '@/lib/messages/rateLimit';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';
import { advanceThreadReadCursor, readCursorInputSchema } from '@/lib/messages/readCursor';
import { isReadOnlyPortalAuditHeader } from '@/lib/audit/readOnlyPortalAudit';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thread = await getOrCreatePartnerMessageThread(ctx.partnerId);

  const messages = await prisma.$transaction((tx) => tx.message.findMany({
    where: { threadId: thread.id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 500,
  }));

  return NextResponse.json({
    thread: {
      id: thread.id,
      kind: thread.kind,
      partnerId: thread.partnerId,
      portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null,
      staffLastReadAt: thread.staffLastReadAt?.toISOString() ?? null,
      staffUserId: thread.staffUserId,
    },
    messages: messages.reverse().map(serializeMessage),
  });

  } catch (error) {
    console.error('/partner/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getPartnerForUser(user.id);
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

  const thread = await getOrCreatePartnerMessageThread(ctx.partnerId);
  const ok = await assertPartnerCanAccessThread(ctx.partnerId, thread.id);
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
    action: 'partner_message_sent',
    targetType: 'User',
    targetId: user.id,
    metadata: { messageId: msg.id, threadId: thread.id, partnerId: ctx.partnerId },
  }).catch(() => {});
  logAuditEvent({
    user: { id: user.id, role: 'partner' },
    verb: 'sent',
    object: { type: 'PartnerMessage', id: msg.id },
    result: { success: true, extensions: { threadId: thread.id } },
  }).catch(() => {});

  return NextResponse.json({ message: serializeMessage(msg) });

  } catch (error) {
    console.error('/partner/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _PATCH(request: Request) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const readOnlyAudit = isReadOnlyPortalAuditHeader(request.headers);
  const ctx = await getPartnerForUser(user.id, { readOnlyAudit });
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Read acknowledgements must never provision a conversation.
  const thread = await prisma.$transaction((tx) => tx.messageThread.findUnique({
    where: { partnerId: ctx.partnerId },
  }));
  if (!thread) return NextResponse.json({ ok: true, portalUserLastReadAt: null });
  const ok = await assertPartnerCanAccessThread(ctx.partnerId, thread.id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (readOnlyAudit) {
    return NextResponse.json({ ok: true, portalUserLastReadAt: thread.portalUserLastReadAt?.toISOString() ?? null });
  }

  const raw = await request.text();
  let body: unknown;
  try { body = raw.trim() ? JSON.parse(raw) : {}; }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = readCursorInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid read cursor' }, { status: 400 });
  const result = await advanceThreadReadCursor({
    threadId: thread.id,
    messageId: parsed.data.lastReadMessageId,
    reader: 'portal',
  });
  if (!result.ok) return NextResponse.json({ error: 'Message not found in this conversation' }, { status: 400 });

  return NextResponse.json({ ok: true, portalUserLastReadAt: result.readAt });

  } catch (error) {
    console.error('/partner/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);
