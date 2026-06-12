import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

import { withApiGuc } from '@/lib/db/withRequestGuc';export const PATCH = withApiGuc(async (request: Request) => {
  try {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const notificationsUpdates = typeof o.notificationsUpdates === 'boolean' ? o.notificationsUpdates : undefined;
  const notificationsReminders = typeof o.notificationsReminders === 'boolean' ? o.notificationsReminders : undefined;

  if (notificationsUpdates === undefined && notificationsReminders === undefined) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const data: Record<string, boolean> = {};
  if (notificationsUpdates !== undefined) data.notificationsUpdates = notificationsUpdates;
  if (notificationsReminders !== undefined) data.notificationsReminders = notificationsReminders;

  await prisma.$transaction((tx) => tx.user.update({
    where: { id: user.id },
    data,
  }));

  return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('/member/settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

