import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';

/**
 * Cron endpoint to run automation checks (inactive nudge).
 * For weekly recap, use /api/cron/weekly-recap instead.
 * Call from Vercel Cron or external scheduler.
 * Protected with CRON_SECRET header (required - rejects if env var not set).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
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
    where: { deletedAt: null, notificationsReminders: true },
    select: { id: true },
  }).then((users) => {
    const eventUserIds = new Set(lastEvents.map((r) => r.userId));
    return users.filter((u) => !eventUserIds.has(u.id)).map((u) => u.id);
  });

  const allInactive = [...new Set([...inactiveUserIds, ...usersWithNoEvents])];

  const members = await prisma.user.findMany({
    where: {
      id: { in: allInactive },
      deletedAt: null,
      notificationsReminders: true,
    },
    select: { id: true, email: true, fullName: true },
  });

  let sent = 0;
  for (const member of members) {
    try {
      const result = await sendInactiveNudgeEmail({
        to: member.email,
        fullName: member.fullName,
      });
      if (result.ok) sent++;
    } catch (err) {
      console.error(`Inactive nudge failed for user ${member.id}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    inactive7DaysCount: allInactive.length,
    emailsSent: sent,
  });
}