import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';

/**
 * Cron endpoint to send inactive member nudge emails.
 * Run daily (e.g. via Vercel Cron: "0 10 * * *" for 10 AM).
 * Sends to members inactive for 7+ days who have notificationsReminders enabled.
 * Protected with CRON_SECRET header.
 *
 * PERF: Instead of scanning the entire member_events table with an unfiltered
 * groupBy, we query only events from the last 7 days to find ACTIVE users,
 * then find eligible members NOT in that set. This bounds the scan to a 7-day
 * window regardless of table size.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find users who HAVE had activity in the last 7 days (bounded scan).
  const recentlyActive = await prisma.memberEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: sevenDaysAgo } },
  });
  const activeUserIds = new Set(recentlyActive.map((r) => r.userId));

  // Find eligible members who are NOT in the active set (capped to 1000 per run).
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      notificationsReminders: true,
      id: { notIn: [...activeUserIds] },
    },
    select: { id: true, email: true, fullName: true },
    take: 1000,
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
      captureApiError(err, { route: 'cron/inactive-nudge', extra: { userId: member.id } });
    }
  }

  const runResult = { ok: true, checkedAt: new Date().toISOString(), recentlyActiveCount: activeUserIds.size, inactiveEmailsSent: sent };
  await logCronRun('cron_inactive_nudge', runResult);
  return NextResponse.json(runResult);
}
