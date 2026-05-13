import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationDb = (prisma as any).notification;

    if (!notificationDb) {
      return NextResponse.json({ ok: true, updatedCount: 0, unreadCount: 0 });
    }

    const result = await notificationDb.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    const unreadCount = await notificationDb.count({
      where: { userId: user.id, readAt: null },
    });

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
