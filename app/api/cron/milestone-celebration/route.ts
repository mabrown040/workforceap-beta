import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendCourseCompletedEmail } from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { authorizeCronRequest } from '@/lib/cron/authorizeCronRequest';
import { isCronEnabled } from '@/lib/cron/isCronEnabled';

/**
 * GET /api/cron/milestone-celebration
 *
 * Sends a celebration email when a member completes all courses in their program.
 * Runs daily to catch completions from the previous day. Secured by CRON_SECRET.
 *
 * Deploy with Vercel Cron: schedule "0 11 * * *" (daily 11AM UTC)
 */
async function handle(req: NextRequest) {
  const unauthorized = authorizeCronRequest(req);
  if (unauthorized) return unauthorized;

  if (!(await isCronEnabled('cron_milestone_celebration'))) {
    await logCronRun('cron_milestone_celebration', { skipped: true, reason: 'disabled' }, 'ok');
    return NextResponse.json({ skipped: true, reason: 'disabled' });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Find members whose assessment was completed since yesterday (proxy for program completion)
  const completed = await prisma.user.findMany({
    where: {
      deletedAt: null,
      enrolledProgram: { not: null },
      assessmentCompleted: true,
      assessmentCompletedAt: { gte: yesterday },
    },
    select: { id: true, email: true, fullName: true, enrolledProgram: true, assessmentCompletedAt: true },
    take: 100,
  });

  let sent = 0;

  for (const member of completed) {
    try {
      await sendCourseCompletedEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
        courseName: member.enrolledProgram ?? 'your program',
      });
      sent++;
    } catch {
      /* non-fatal */
    }
  }

  const runResult = { sent, total: completed.length };
  await logCronRun('cron_milestone_celebration', runResult);
  return NextResponse.json(runResult);
}

export const GET = handle;
export const POST = handle;
