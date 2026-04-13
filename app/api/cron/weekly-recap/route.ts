import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendWeeklyRecapEmail } from '@/lib/email';
import { generateWeeklyRecap } from '@/lib/recap/generate';

/**
 * GET /api/cron/weekly-recap
 *
 * Sends weekly recap emails to all active members who have not
 * received one this week. Secured by CRON_SECRET header.
 *
 * Deploy with Vercel Cron: schedule "0 9 * * 1" (Monday 9AM UTC)
 *
 * Or trigger manually from admin at /admin/weekly-recap.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);

  // Get active members who haven't had a recap opened this week
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
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
      console.error('[cron/weekly-recap] failed for', member.email, e);
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: members.length });
}
