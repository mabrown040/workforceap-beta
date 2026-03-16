import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Cron endpoint to run automation checks.
 * Call from Vercel Cron or external scheduler.
 * In production, protect with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const lastEvents = await prisma.memberEvent.groupBy({
    by: ['userId'],
    _max: { createdAt: true },
  });

  const inactiveUserIds: string[] = [];
  for (const row of lastEvents) {
    const lastAt = row._max.createdAt;
    if (lastAt && lastAt < sevenDaysAgo) {
      inactiveUserIds.push(row.userId);
    }
  }

  const usersWithNoEvents = await prisma.user.findMany({
    select: { id: true },
  }).then((users) => {
    const eventUserIds = new Set(lastEvents.map((r) => r.userId));
    return users.filter((u) => !eventUserIds.has(u.id)).map((u) => u.id);
  });

  const allInactive = [...new Set([...inactiveUserIds, ...usersWithNoEvents])];

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    inactive7DaysCount: allInactive.length,
    inactiveUserIds: allInactive.slice(0, 20),
    message: 'Automation check complete. Nudge emails would be sent in production.',
  });
}
