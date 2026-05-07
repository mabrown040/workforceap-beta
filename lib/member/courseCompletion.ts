import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug, getDiscoveredProgram } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { markCourseProgressCompleted } from '@/lib/member/courseProgress';
import { resolveProgramCourseWithCatalogFallback } from '@/lib/member/programCourseMatch';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { sendCourseCompletedEmail } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';
import { awardPoints } from '@/lib/member/points';

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
    select: { enrolledProgram: true, coursesCompleted: true, email: true, fullName: true },
  });

  if (!dbUser?.enrolledProgram) {
    throw new Error('No program enrolled');
  }

  const program = getProgramBySlug(dbUser.enrolledProgram);
  if (!program) {
    throw new Error('Invalid program');
  }

  const matchedCourse = resolveProgramCourseWithCatalogFallback(program, {
    courseraCourseId: args.courseraCourseId ?? null,
    enrolledProgramSlug: dbUser.enrolledProgram,
    courseSlug: args.courseSlug,
    courseName: args.courseName,
  });

  if (!matchedCourse) {
    throw new Error('Course not found in member program');
  }

  const completed = parseCourseSlugList(dbUser.coursesCompleted);
  if (completed.includes(matchedCourse.slug)) {
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
      completedCount: completed.length,
    };
  }

  const updated = [...completed, matchedCourse.slug];
  const shouldNotify = args.notify ?? args.source !== 'coursera-enterprise-sync';

  await prisma.user.update({
    where: { id: args.userId },
    data: { coursesCompleted: updated },
  });

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
      completedCount: updated.length,
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

    handleLearningCompletion(args.userId, matchedCourse.name).catch((error) =>
      console.error('[career-os] learning completion workflow failed:', error)
    );
  }

  awardPoints(args.userId, 'course_completed', matchedCourse.slug).catch(() => {});

  return {
    ok: true,
    alreadyCompleted: false,
    courseSlug: matchedCourse.slug,
    courseName: matchedCourse.name,
    programSlug: dbUser.enrolledProgram,
    completedCount: updated.length,
  };
}
