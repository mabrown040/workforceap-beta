import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateWeeklyRecap } from '@/lib/recap/generate';
import { getWeekBounds } from '@/lib/recap/generate';
import { sendWeeklyRecapEmail } from '@/lib/email';

/**
 * Cron endpoint to generate and email weekly recaps.
 * Run Sundays 6 PM (e.g. via Vercel Cron: "0 18 * * 0").
 * Protected with CRON_SECRET header.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const { start: weekStart, end: weekEnd } = getWeekBounds(now);

  // Active members: enrolled, not deleted, opted into updates
  const members = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      notificationsUpdates: true,
    },
    select: { id: true, email: true, fullName: true },
  });

  let generated = 0;
  let emailed = 0;

  for (const member of members) {
    try {
      const recap = await generateWeeklyRecap(member.id, weekStart, weekEnd);
      generated++;

      const recapJson = recap.recapJson as {
        weekInReview?: { applicationsAdded?: number; resourcesCompleted?: number; aiToolsUsed?: number; pathwayStepsCompleted?: number };
        recommendedActions?: string[];
      };
      const review = recapJson?.weekInReview ?? {};
      const lines: string[] = [];
      lines.push(`Applications added: ${review.applicationsAdded ?? 0}`);
      lines.push(`Resources completed: ${review.resourcesCompleted ?? 0}`);
      lines.push(`AI tools used: ${review.aiToolsUsed ?? 0}`);
      lines.push(`Pathway steps completed: ${review.pathwayStepsCompleted ?? 0}`);
      if (recapJson?.recommendedActions?.length) {
        lines.push(`Next: ${recapJson.recommendedActions[0]}`);
      }
      const recapSummary = lines.join('. ');

      const result = await sendWeeklyRecapEmail({
        to: member.email,
        fullName: member.fullName,
        recapSummary,
      });
      if (result.ok) {
        emailed++;
        await prisma.weeklyRecap.update({
          where: { id: recap.id },
          data: { emailedAt: new Date() },
        });
      }
    } catch (err) {
      console.error(`Weekly recap failed for user ${member.id}:`, err);
    }
  }

  return NextResponse.json({
    ok: true,
    checkedAt: now.toISOString(),
    weekStart: weekStart.toISOString(),
    membersProcessed: members.length,
    recapsGenerated: generated,
    emailsSent: emailed,
  });
}
