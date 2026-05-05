import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';

/**
 * POST /api/cron/inactivity-nudge
 *
 * Sends a re-engagement nudge to members who have been inactive
 * for 14+ days. Capped at 100/run to avoid spam. Secured by CRON_SECRET.
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
  });
  const activeSet = new Set(recentActiveUserIds.map(r => r.userId));

  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      notificationsReminders: true,
      id: { notIn: [...activeSet] },
    },
    select: { id: true, email: true, fullName: true, enrolledProgram: true, enrolledAt: true },
    take: 100,
    orderBy: { enrolledAt: 'asc' },
  });

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    try {
      await sendInactiveNudgeEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
      });
      sent++;
    } catch (e) {
      captureApiError(e, { route: 'cron/inactivity-nudge', extra: { userId: member.id } });
      failed++;
    }
  }

  const runResult = { sent, failed, total: members.length };
  await logCronRun('cron_inactivity_nudge', runResult, failed === members.length && members.length > 0 ? 'error' : 'ok');
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_inactivity_nudge', handle);
export const POST = withCronLogging('cron_inactivity_nudge', handle);
