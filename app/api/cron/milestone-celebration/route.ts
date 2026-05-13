import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendCourseCompletedEmail } from '@/lib/email';
import { logCronRun } from '@/lib/admin/logCronRun';
import { getProgramBySlug, getProgramDisplayTitle } from '@/lib/content/programs';
import { withCronLogging } from '@/lib/cron/withCronLogging';
import { setCronRecordsProcessed } from '@/lib/cron/cronExecution';

/**
 * GET /api/cron/milestone-celebration
 *
 * Sends a celebration email when a member completes all courses in their program.
 * Runs daily to catch completions from the previous day. Secured by CRON_SECRET.
 *
 * Deploy with Vercel Cron: schedule "0 11 * * *" (daily 11AM UTC)
 */
async function handle(_req: NextRequest) {
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
      // Source the program name from the milestone (the most recently
      // completed `course_progress` row) instead of `member.enrolledProgram`.
      // Multi-program learners may have hit this milestone in their
      // secondary program; congratulating them on their primary program
      // is a user-visible bug.
      const milestone = await prisma.courseProgress.findFirst({
        where: {
          userId: member.id,
          status: 'COMPLETED',
          completedAt: { gte: yesterday },
        },
        orderBy: { completedAt: 'desc' },
        select: { programSlug: true },
      });

      const programSlug = milestone?.programSlug ?? member.enrolledProgram ?? null;
      const program = programSlug ? getProgramBySlug(programSlug) : undefined;
      const programName = program
        ? getProgramDisplayTitle(program)
        : programSlug ?? 'your program';

      await sendCourseCompletedEmail({
        to: member.email,
        fullName: member.fullName ?? member.email,
        courseName: programName,
      });
      sent++;
    } catch {
      /* non-fatal */
    }
  }

  const runResult = { sent, total: completed.length };
  await setCronRecordsProcessed(sent);
  await logCronRun('cron_milestone_celebration', runResult);
  return NextResponse.json(runResult);
}

export const GET = withCronLogging('cron_milestone_celebration', handle);
export const POST = withCronLogging('cron_milestone_celebration', handle);
