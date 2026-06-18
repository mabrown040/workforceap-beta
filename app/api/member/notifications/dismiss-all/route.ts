import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';
import { auditLog } from '@/lib/audit';
import { logAuditEvent } from '@/lib/audit/log';

async function _POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.$transaction((tx) => tx.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    }));

    const unreadCount = await prisma.$transaction((tx) => tx.notification.count({
      where: { userId: user.id, readAt: null },
    }));

    auditLog({ actorUserId: user.id, action: 'member.notifications.dismissAll', targetType: 'NotificationBatch', targetId: user.id }).catch(() => {});
    logAuditEvent({ user: { id: user.id, role: 'member' }, verb: 'update', object: { type: 'NotificationBatch', id: user.id }, result: { success: true } }).catch(() => {});
    return NextResponse.json({
      ok: true,
      updatedCount: result.count,
      unreadCount,
    });
  } catch (error) {
    console.error('/member/notifications/dismiss-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);
