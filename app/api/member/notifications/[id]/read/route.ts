import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

type Props = { params: Promise<{ id: string }> };

const markRead = withApiGuc(async (_request: Request, { params }: Props) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.$transaction((tx) => tx.notification.findUnique({
      where: { id },
    }));

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.$transaction((tx) => tx.notification.update({
      where: { id },
      data: { readAt: new Date() },
    }));

    auditLog({ actorUserId: user.id, action: 'member.notification.read', targetType: 'Notification', targetId: id }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'Notification', id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({
      ok: true,
      notification: {
        id: updated.id,
        type: updated.type,
        title: updated.title,
        body: updated.body,
        data: updated.data ?? null,
        readAt: updated.readAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('/member/notifications/[id]/read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PUT = markRead;
export const PATCH = markRead;
