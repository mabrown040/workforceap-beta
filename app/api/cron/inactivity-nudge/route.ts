import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { filterNudgeEligibleUserIds, recordNudgeSent } from '@/lib/cron/nudgeThrottle';
import { createNotification } from '@/lib/notifications/create';

/**
 * POST /api/cron/inactivity-nudge
 *
 * Sends a re-engagement nudge to members who have been inactive
 * for 14+ days. Capped at 100/run to avoid spam. Secured by CRON_SECRET.
 * Shares a 7-day cross-cron cooldown (via `MemberNudgeLog`) with
 * inactive-nudge and course-accountability — see lib/cron/nudgeThrottle.ts.
 *
 * Deploy with Vercel Cron: schedule "0 10 * * 3" (Wednesday 10AM UTC)
 */
async function handle(_req: NextRequest) {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Find enrolled members with no events in 14 days
  const recentActiveUserIds = await prisma.memberEvent.findMany({
    where: { createdAt: { gte: fourteenDaysAgo } },
    select: { userId: true },
    distinct: ['userId'],
    take: 100,
  });
  const activeSet = new Set(recentActiveUserIds.map(r => r.userId));

  // Recipient is anyone with at least one row in `course_enrollments`
  // (covers multi-program users whose `enrolledProgram` may be null), OR
  // who still has the legacy `enrolledProgram` pointer set (covers
  // unmigrated single-program users).
  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { courseEnrollments: { some: {} } },
        { enrolledProgram: { not: null } },
      ],
      notificationsReminders: true,
      id: { notIn: [...activeSet] },
    },
    select: { id: true, email: true, fullName: true, enrolledProgram: true, enrolledAt: true },
    take: 100,
    orderBy: { enrolledAt: 'asc' },
  });

  // Shared cross-cron cooldown: skip anyone nudged by ANY of these crons in
  // the last 7 days (one shared query, not per-cron logic).
  const eligibleUserIds = await filterNudgeEligibleUserIds(candidates.map((m) => m.id));
  const members = candidates.filter((m) => eligibleUserIds.has(m.id));

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    try {
      await sendInactiveNudgeEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
      });
      sent++;

      await recordNudgeSent({ userId: member.id, tier: 'yellow', kind: 'inactivity' });

      await createNotification({
        userId: member.id,
        type: 'nudge',
        title: "We haven't seen you in a while",
        body: "It's been two weeks — let's get you back on track with your training.",
        data: { link: '/dashboard' },
      });
    } catch (e) {
      captureApiError(e, { route: 'cron/inactivity-nudge', extra: { userId: member.id } });
      failed++;
    }
  }

  const runResult = { sent, failed, total: members.length };
  await setCronRecordsProcessed(sent);
  await logCronRun('cron_inactivity_nudge', runResult, failed === members.length && members.length > 0 ? 'error' : 'ok');
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_inactivity_nudge', handle);
export const POST = withCronLogging('cron_inactivity_nudge', handle);
