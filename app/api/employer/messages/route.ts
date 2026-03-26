import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import {
  getOrCreateEmployerMessageThread,
  assertEmployerUserCanAccessThread,
} from '@/lib/messages/portalThreads';
import { normalizeMessageBody, serializeMessage } from '@/lib/messages/counselorThread';

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);

  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });

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
}

export async function POST(request: NextRequest) {
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

  return NextResponse.json({ message: serializeMessage(msg) });
}

export async function PATCH() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const thread = await getOrCreateEmployerMessageThread(ctx.employerId);
  const ok = await assertEmployerUserCanAccessThread(user.id, thread.id);
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  await prisma.messageThread.update({
    where: { id: thread.id },
    data: { portalUserLastReadAt: now },
  });

  return NextResponse.json({ ok: true, portalUserLastReadAt: now.toISOString() });
}
