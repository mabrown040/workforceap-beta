import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withRouteObservability } from '@/lib/api/routeObservability';

type Props = { params: Promise<{ id: string }> };export const DELETE = withRouteObservability(async (_request: Request, { params }: Props) => {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('/member/notifications/[id] delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
