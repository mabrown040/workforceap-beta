import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendWeeklyRecapEmail } from '@/lib/email';
import { buildWeeklyRecapEmailSummary } from '@/lib/recap/buildWeeklyRecapEmailSummary';
import { generateWeeklyRecaps } from '@/lib/recap/generate';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';
import { getWeeklyRecapCronStatus } from './_weeklyRecapCronStatus';

/**
 * GET /api/cron/weekly-recap
 *
 * Sends weekly recap emails to all active members who have not
 * received one this week. Secured by CRON_SECRET header.
 *
 * Deploy with Vercel Cron: schedule "0 18 * * 0" (Sunday 6PM UTC). Requires
 * `CRON_SECRET` in project env (Vercel invokes the route with that bearer token).
 *
 * Or trigger manually from admin at /admin/weekly-recap.
 */
async function handle(_request: Request) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  // Get active members who have not had a recap opened this week.
  // Recipient is anyone with at least one row in `course_enrollments`
  // (multi-program members may not have `enrolledProgram` set), OR who
  // still has the legacy `enrolledProgram` denormalized pointer set
  // (covers unmigrated single-program users).
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      OR: [
        { courseEnrollments: { some: {} } },
        { enrolledProgram: { not: null } },
      ],
      // Members who have no recap for this week yet
      weeklyRecaps: { none: { weekStartDate: { gte: weekStart } } },
    },
    select: { id: true, email: true, fullName: true, enrolledProgram: true },
    take: 500,
  });

  let sent = 0;
  let failed = 0;

  // Batch-generate recaps to eliminate read-side N+1 (~10 queries total vs 10×N)
  const recaps = await generateWeeklyRecaps(members, weekStart);
  const recapByUserId = new Map(recaps.map((r) => [r.userId, r.recapData]));

  for (const member of members) {
    try {
      const recapData = recapByUserId.get(member.id) as Parameters<typeof buildWeeklyRecapEmailSummary>[0] | undefined;
      if (!recapData) { failed++; continue; }

      const recapSummary = buildWeeklyRecapEmailSummary(recapData);

      const result = await sendWeeklyRecapEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
        recapSummary,
      });

      // sendWeeklyRecapEmail catches Resend failures internally and
      // returns `{ ok: false }` rather than throwing. Without this
      // check the previous version booked every recipient as `sent`,
      // making the metric meaningless and hiding deliverability
      // regressions from the cron dashboard.
      if (result?.ok === false) {
        captureApiError(new Error(result.error ?? 'sendWeeklyRecapEmail failed'), {
          route: 'cron/weekly-recap',
          extra: { userId: member.id },
        });
        failed++;
      } else {
        // Do not set openedAt here — that field means the member opened the recap in the portal.
        sent++;
      }
    } catch (e) {
      captureApiError(e, { route: 'cron/weekly-recap', extra: { userId: member.id } });
      failed++;
    }
  }

  const runResult = { sent, failed, total: members.length };
  await setCronRecordsProcessed(sent);
  await logCronRun('cron_weekly_recap', runResult, getWeeklyRecapCronStatus(failed));
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_weekly_recap', handle);
export const POST = withCronLogging('cron_weekly_recap', handle);
