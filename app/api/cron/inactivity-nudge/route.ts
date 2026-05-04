import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendInactiveNudgeEmail } from '@/lib/email';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';
import { isCronEnabled } from '@/lib/cron/isCronEnabled';

/**
 * POST /api/cron/inactivity-nudge
 *
 * Sends a re-engagement nudge to members who have been inactive
 * for 14+ days. Capped at 100/run to avoid spam. Secured by CRON_SECRET.
 *
 * Deploy with Vercel Cron: schedule "0 10 * * 3" (Wednesday 10AM UTC)
 */
async function handle(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  if (!(await isCronEnabled('cron_inactivity_nudge'))) {
    await logCronRun('cron_inactivity_nudge', { skipped: true, reason: 'disabled' }, 'ok');
    return NextResponse.json({ skipped: true, reason: 'disabled' });
  }

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

export const GET = handle;
export const POST = handle;
