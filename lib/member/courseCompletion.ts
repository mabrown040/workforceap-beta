import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug, getDiscoveredProgram } from '@/lib/content/programs';
import { markCourseProgressCompleted } from '@/lib/member/courseProgress';
import { resolveProgramCourseWithCatalogFallback } from '@/lib/member/programCourseMatch';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { createNotification } from '@/lib/notifications/create';
import { sendCourseCompletedEmail } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { handleLearningCompletion, handleProgramCompletion } from '@/lib/workflows/careerOS';
import { awardPoints } from '@/lib/member/points';
import { detectCompletionMilestone } from '@/lib/milestoneCascade/detectCompletionMilestone';
import { memberProgramCompleted } from '@/lib/partner/memberProgress';

export async function completeMemberCourse(args: {
  userId: string;
  courseSlug?: string;
  courseName?: string;
  /** Coursera's canonical courseId from xAPI context.extensions, when known.
   *  Used as the primary join key against the catalog — required for xAPI
   *  ingestion since URL-tail slug heuristics can't tell course IDs from
   *  item IDs. */
  courseraCourseId?: string | null;
  source: 'member' | 'coursera-webhook' | 'coursera-enterprise-sync';
  /**
   * When false, skip milestone emails and career workflows (bulk Coursera API reconciliation).
   * Still writes courses_completed, CourseProgress, and analytics.
   */
  notify?: boolean;
}) {
  const dbUser = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { enrolledProgram: true, email: true, fullName: true },
  });

  if (!dbUser?.enrolledProgram) {
    throw new Error('No program enrolled');
  }

  const program = getProgramBySlug(dbUser.enrolledProgram);
  if (!program) {
    throw new Error('Invalid program');
  }

  // Resolution order: admin-curated `coursera_canonical_course_mappings` row
  // (DB) → static DISCOVERED_COURSERA_PROGRAMS catalog → WAP slug match →
  // discovered fuzzy fallback. See `resolveProgramCourseWithCatalogFallback`.
  const matchedCourse = await resolveProgramCourseWithCatalogFallback(program, {
    courseraCourseId: args.courseraCourseId ?? null,
    enrolledProgramSlug: dbUser.enrolledProgram,
    courseSlug: args.courseSlug,
    courseName: args.courseName,
  });

  if (!matchedCourse) {
    throw new Error('Course not found in member program');
  }

  const existingCompletion = await prisma.courseProgress.findUnique({
    where: {
      userId_programSlug_courseSlug: {
        userId: args.userId,
        programSlug: dbUser.enrolledProgram,
        courseSlug: matchedCourse.slug,
      },
    },
    select: { status: true },
  });

  if (existingCompletion?.status === 'COMPLETED') {
    const discovered = getDiscoveredProgram(dbUser.enrolledProgram);
    const discoveredMeta = discovered?.courses.find((c) => c.slug === matchedCourse.slug);
    await markCourseProgressCompleted({
      userId: args.userId,
      programSlug: dbUser.enrolledProgram,
      courseSlug: matchedCourse.slug,
      courseId: discoveredMeta?.courseId ?? null,
    }).catch(() => {});
    return {
      ok: true,
      alreadyCompleted: true,
      courseSlug: matchedCourse.slug,
      courseName: matchedCourse.name,
      programSlug: dbUser.enrolledProgram,
      completedCount: await prisma.courseProgress.count({
        where: { userId: args.userId, programSlug: dbUser.enrolledProgram, status: 'COMPLETED' },
      }),
    };
  }

  const shouldNotify = args.notify ?? args.source !== 'coursera-enterprise-sync';

  const discovered = getDiscoveredProgram(dbUser.enrolledProgram);
  const discoveredMeta = discovered?.courses.find((c) => c.slug === matchedCourse.slug);
  await markCourseProgressCompleted({
    userId: args.userId,
    programSlug: dbUser.enrolledProgram,
    courseSlug: matchedCourse.slug,
    courseId: discoveredMeta?.courseId ?? null,
  }).catch(() => {});

  trackEvent({
    userId: args.userId,
    eventName: 'course_completed',
    entityType: 'Course',
    entityId: matchedCourse.slug,
    metadata: {
      courseName: matchedCourse.name,
      programSlug: dbUser.enrolledProgram,
      completedCount: await prisma.courseProgress.count({
        where: { userId: args.userId, programSlug: dbUser.enrolledProgram, status: 'COMPLETED' },
      }),
      source: args.source,
    },
  }).catch(() => {});

  if (shouldNotify) {
    sendPartnerMilestoneEmail(args.userId, 'Course completed', {
      Course: matchedCourse.name,
    }).catch((error) => console.error('Partner milestone email failed:', error));

    sendCourseCompletedEmail({
      to: dbUser.email,
      fullName: dbUser.fullName,
      courseName: matchedCourse.name,
    }).catch((error) => console.error('Course completed email failed:', error));

    void createNotification({
      userId: args.userId,
      type: 'course_complete',
      title: 'Course completed!',
      body: `You completed ${matchedCourse.name}. Great work!`,
      data: { courseSlug: matchedCourse.slug, courseName: matchedCourse.name },
    });

    const counselors = await prisma.counselorAssignment.findMany({
      where: { memberId: args.userId, active: true },
      select: { counselor: { select: { userId: true } } },
    });
    for (const assignment of counselors) {
      if (assignment.counselor?.userId) {
        void createNotification({
          userId: assignment.counselor.userId,
          type: 'course_complete',
          title: `${dbUser.fullName ?? 'Member'} completed a course`,
          body: `${dbUser.fullName ?? 'A member'} completed ${matchedCourse.name}.`,
          data: { memberId: args.userId, courseSlug: matchedCourse.slug, courseName: matchedCourse.name },
        });
      }
    }

    handleLearningCompletion(args.userId, matchedCourse.name).catch((error) =>
      console.error('[career-os] learning completion workflow failed:', error)
    );

    // Program-completion check — the graduation moment, distinct from the
    // per-course nudge above. Fires at most once per (member, program); see
    // handleProgramCompletion for the idempotency guard. Only covers
    // completions that flow through THIS function (member self-report,
    // coursera-webhook, coursera-enterprise-sync) — the separate B4B
    // org-wide sync cron (lib/coursera/b4bSync.ts) writes CourseProgress
    // directly and does not call completeMemberCourse, so a completion
    // detected only by that batch job won't trigger this yet.
    const completedSlugs = await prisma.courseProgress.findMany({
      where: { userId: args.userId, programSlug: dbUser.enrolledProgram, status: 'COMPLETED' },
      select: { courseSlug: true },
    });
    if (memberProgramCompleted(dbUser.enrolledProgram, completedSlugs.map((c) => c.courseSlug))) {
      handleProgramCompletion(args.userId, dbUser.enrolledProgram, program.title).catch((error) =>
        console.error('[career-os] program completion workflow failed:', error)
      );
    }

    // Milestone cascade detection: insert a row in milestone_cascades for the
    // counselor-review pipeline. Idempotent and self-contained — never throws,
    // never blocks the completion flow. The LLM drafting + approval UI live
    // in follow-up PRs; this call seeds the queue.
    detectCompletionMilestone({
      userId: args.userId,
      courseSlug: matchedCourse.slug,
      courseName: matchedCourse.name,
      programSlug: dbUser.enrolledProgram,
      completedCount: await prisma.courseProgress.count({
        where: { userId: args.userId, programSlug: dbUser.enrolledProgram, status: 'COMPLETED' },
      }),
      source: args.source,
    }).catch((error) => console.error('[milestone-cascade] detect failed:', error));
  }

  awardPoints(args.userId, 'course_completed', matchedCourse.slug).catch(() => {});

  return {
    ok: true,
    alreadyCompleted: false,
    courseSlug: matchedCourse.slug,
    courseName: matchedCourse.name,
    programSlug: dbUser.enrolledProgram,
    completedCount: await prisma.courseProgress.count({
      where: { userId: args.userId, programSlug: dbUser.enrolledProgram, status: 'COMPLETED' },
    }),
  };
}
