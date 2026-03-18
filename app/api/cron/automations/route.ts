import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Cron endpoint to run automation checks.
 * Call from Vercel Cron or external scheduler.
 * Protected with CRON_SECRET header (required - rejects if env var not set).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: if CRON_SECRET not set, reject all requests
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

  // TODO: Implement nudge emails using Resend
  // for (const userId of allInactive) { await sendNudgeEmail(userId); }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    inactive7DaysCount: allInactive.length,
    // Note: user IDs intentionally omitted for security
    message: 'Automation check complete.',
  });
}