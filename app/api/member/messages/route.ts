import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import {
  getOrCreateMemberCounselorThread,
  assertMemberCanAccessThread,
  normalizeMessageBody,
  serializeMessage,
} from '@/lib/messages/counselorThread';
import { checkMessageRateLimit } from '@/lib/messages/rateLimit';
import { createNotification } from '@/lib/notifications/create';

import { withApiGuc } from '@/lib/db/withRequestGuc';async function _GET() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await getOrCreateMemberCounselorThread(user.id);
  const threadCounselorUserId = thread.counselorUserId;

  const [messages, counselor] = await Promise.all([
    prisma.$transaction((tx) => tx.message.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 500,
    })),
    threadCounselorUserId
      ? prisma.$transaction((tx) => tx.user.findUnique({
          where: { id: threadCounselorUserId },
          select: { fullName: true },
        }))
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    thread: {
      id: thread.id,
      memberId: thread.memberId,
      counselorUserId: thread.counselorUserId,
      memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
      counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
    },
    counselorName: counselor?.fullName ?? null,
    messages: messages.map(serializeMessage),
  });

  } catch (error) {
    console.error('/member/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);async function _POST(request: NextRequest) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  const rl = checkMessageRateLimit(user.id);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many messages. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    );
  }

  const thread = await getOrCreateMemberCounselorThread(user.id);
  const ok = await assertMemberCanAccessThread(user.id, thread.id);
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

  if (thread.counselorUserId) {
    void createNotification({
      userId: thread.counselorUserId,
      type: 'message',
      title: `New message from ${user.email ?? 'member'}`,
      body: normalized.body.slice(0, 200),
      data: { threadId: thread.id, memberId: user.id },
    });
  }

  return NextResponse.json({ message: serializeMessage(msg) });

  } catch (error) {
    console.error('/member/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _PATCH() {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const thread = await getOrCreateMemberCounselorThread(user.id);
  const ok = await assertMemberCanAccessThread(user.id, thread.id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  await prisma.$transaction((tx) => tx.messageThread.update({
    where: { id: thread.id },
    data: { memberLastReadAt: now },
  }));

  return NextResponse.json({ ok: true, memberLastReadAt: now.toISOString() });

  } catch (error) {
    console.error('/member/messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

