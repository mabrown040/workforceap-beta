import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { withApiGuc } from '@/lib/db/withRequestGuc';

async function _POST() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return NextResponse.json({
      ok: true,
      updatedCount: result.count,
      unreadCount,
    });
  } catch (error) {
    console.error('/member/notifications/read-all error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withApiGuc(_POST);
