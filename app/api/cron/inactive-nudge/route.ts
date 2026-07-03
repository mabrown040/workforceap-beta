import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { filterNudgeEligibleUserIds, recordNudgeSent } from '@/lib/cron/nudgeThrottle';
import { createNotification } from '@/lib/notifications/create';

/**
 * Cron endpoint to send inactive member nudge emails.
 * Weekly nudge to members inactive for 7+ days.
 * Runs Monday 10 AM UTC. Deduplicates against memberEvents from the
 * last 7 days so no one receives more than one nudge per week, AND against
 * `MemberNudgeLog` so a member doesn't also get double-nudged by
 * inactivity-nudge / course-accountability in the same window (see
 * lib/cron/nudgeThrottle.ts).
 * Secured with CRON_SECRET.

 */
async function handle(_request: Request) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Find users who already received an inactive nudge in the last 7 days.
  const recentlyNudged = await prisma.memberEvent.groupBy({
    by: ['userId'],
    where: { eventName: 'inactive_nudge_sent', createdAt: { gte: sevenDaysAgo } },
  });
  const nudgedUserIds = new Set(recentlyNudged.map((r) => r.userId));

  // Find users who HAVE had activity in the last 7 days (bounded scan).
  const recentlyActive = await prisma.memberEvent.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: sevenDaysAgo } },
  });
  const activeUserIds = new Set(recentlyActive.map((r) => r.userId));

  // Find eligible members who are NOT active AND NOT recently nudged (capped to 1000 per run).
  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      notificationsReminders: true,
      id: { notIn: [...activeUserIds, ...nudgedUserIds] },
    },
    select: { id: true, email: true, fullName: true },
    take: 1000,
  });

  // Shared cross-cron cooldown: skip anyone nudged by ANY of these crons in
  // the last 7 days (one shared query, not per-cron logic).
  const eligibleUserIds = await filterNudgeEligibleUserIds(candidates.map((m) => m.id));
  const members = candidates.filter((m) => eligibleUserIds.has(m.id));

  let sent = 0;
  for (const member of members) {
    try {
      const result = await sendInactiveNudgeEmail({
        to: member.email,
        fullName: member.fullName,
      });
      if (result.ok) {
        sent++;
        // Record that we sent a nudge so we don't email again this week.
        await prisma.memberEvent.create({
          data: {
            userId: member.id,
            eventName: 'inactive_nudge_sent',
            entityType: 'cron',
            metadata: { source: 'inactive-nudge', weekOf: sevenDaysAgo.toISOString() },
          },
        }).catch(() => { /* non-fatal */ });

        await recordNudgeSent({ userId: member.id, tier: 'yellow', kind: 'inactive' });

        await createNotification({
          userId: member.id,
          type: 'nudge',
          title: "We miss you!",
          body: "It's been a week — pick up where you left off in your training plan.",
          data: { link: '/dashboard' },
        });
      }
    } catch (err) {
      captureApiError(err, { route: 'cron/inactive-nudge', extra: { userId: member.id } });
    }
  }

  const runResult = { ok: true, checkedAt: new Date().toISOString(), recentlyActiveCount: activeUserIds.size, recentlyNudgedCount: nudgedUserIds.size, inactiveEmailsSent: sent };
  await setCronRecordsProcessed(sent);
  await logCronRun('cron_inactive_nudge', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_inactive_nudge', handle);
export const POST = withCronLogging('cron_inactive_nudge', handle);
