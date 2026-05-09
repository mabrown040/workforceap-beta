import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendWeeklyRecapEmail } from '@/lib/email';
import { generateWeeklyRecap } from '@/lib/recap/generate';
import { captureApiError } from '@/lib/observability/captureApiError';
import { logCronRun } from '@/lib/admin/logCronRun';
import { withCronLogging } from '@/lib/cron/withCronLogging';

/**
 * GET /api/cron/weekly-recap
 *
 * Sends weekly recap emails to all active members who have not
 * received one this week. Secured by CRON_SECRET header.
 *
 * Deploy with Vercel Cron: schedule "0 18 * * 0" (Sunday 6PM UTC)
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

  for (const member of members) {
    try {
      const recap = await generateWeeklyRecap(member.id, weekStart);
      if (!recap) { failed++; continue; }

      const recapData = recap.recapJson as {
        weekInReview?: { applicationsAdded?: number; resourcesCompleted?: number; aiToolsUsed?: number; pathwayStepsCompleted?: number };
        recommendedActions?: string[];
        readinessScoreSnapshot?: number;
      } | null;

      const review = recapData?.weekInReview ?? {};
      const actions = (recapData?.recommendedActions ?? []).slice(0, 3).map(a => `• ${a}`).join('\n');
      const recapSummary = [
        `Applications added: ${review.applicationsAdded ?? 0}`,
        `Resources completed: ${review.resourcesCompleted ?? 0}`,
        `AI tools used: ${review.aiToolsUsed ?? 0}`,
        actions ? `\nRecommended this week:\n${actions}` : '',
      ].filter(Boolean).join('\n');

      await sendWeeklyRecapEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
        recapSummary,
      });

      // Mark as opened (closest proxy for "sent" in schema)
      if (!recap.openedAt) {
        await prisma.weeklyRecap.update({ where: { id: recap.id }, data: { openedAt: new Date() } }).catch(() => {});
      }
      sent++;
    } catch (e) {
      captureApiError(e, { route: 'cron/weekly-recap', extra: { userId: member.id } });
      failed++;
    }
  }

  const runResult = { sent, failed, total: members.length };
  await logCronRun('cron_weekly_recap', runResult, failed === members.length && members.length > 0 ? 'error' : 'ok');
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_weekly_recap', handle);
export const POST = withCronLogging('cron_weekly_recap', handle);
