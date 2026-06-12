import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isSuperAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { assertStaffCanPost, normalizeMessageBody, serializeMessage } from '@/lib/messages/counselorThread';

import { withApiGuc } from '@/lib/db/withRequestGuc';

type Props = { params: Promise<{ threadId: string }> };async function _POST(request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { threadId } = await params;

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

  const canPost = await assertStaffCanPost(user.id, threadId);
  if (!canPost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const msg = await prisma.$transaction(async (tx) => {
    const m = await tx.message.create({
      data: {
        threadId,
        authorId: user.id,
        body: normalized.body,
      },
    });
    await tx.messageThread.update({
      where: { id: threadId },
      data: {
        updatedAt: new Date(),
        staffUserId: user.id,
        staffLastReadAt: new Date(),
      },
    });
    return m;
  });

  return NextResponse.json({ message: serializeMessage(msg) });

  } catch (error) {
    console.error('/admin/messages/thread/[threadId]/staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const POST = withApiGuc(_POST);async function _PATCH(_request: NextRequest, { params }: Props) {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!(await isSuperAdmin(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { threadId } = await params;

  const access = await assertStaffCanPost(user.id, threadId);
  if (!access) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  await prisma.$transaction((tx) => tx.messageThread.update({
    where: { id: threadId },
    data: {
      staffLastReadAt: now,
      staffUserId: user.id,
    },
  }));

  return NextResponse.json({ ok: true, staffLastReadAt: now.toISOString() });

  } catch (error) {
    console.error('/admin/messages/thread/[threadId]/staff error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const PATCH = withApiGuc(_PATCH);

