import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug, type Program } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import { sendPartnerMilestoneEmail } from '@/lib/notifications/partner-notify';
import { sendCourseCompletedEmail } from '@/lib/email';
import { trackEvent } from '@/lib/events/track';
import { handleLearningCompletion } from '@/lib/workflows/careerOS';
import { awardPoints } from '@/lib/member/points';

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveProgramCourse(
  program: Program,
  args: { courseSlug?: string; courseName?: string }
): { slug: string; name: string } | null {
  if (args.courseSlug) {
    const requestedSlug = args.courseSlug.trim();
    const requestedSlugNormalized = normalizeSlug(requestedSlug);
    const bySlug = program.courses.find((course) =>
      course.slug === requestedSlug
      || normalizeSlug(course.slug) === requestedSlugNormalized
      || normalizeSlug(course.name) === requestedSlugNormalized
    );
    if (bySlug) return { slug: bySlug.slug, name: bySlug.name };
  }

  if (args.courseName) {
    const target = normalizeText(args.courseName);
    const targetSlug = normalizeSlug(args.courseName);
    const byName = program.courses.find((course) =>
      normalizeText(course.name) === target || normalizeSlug(course.name) === targetSlug
    );
    if (byName) return { slug: byName.slug, name: byName.name };
  }

  return null;
}

export async function completeMemberCourse(args: {
  userId: string;
  courseSlug?: string;
  courseName?: string;
  source: 'member' | 'coursera-webhook';
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

  const matchedCourse = resolveProgramCourse(program, {
    courseSlug: args.courseSlug,
    courseName: args.courseName,
  });

  if (!matchedCourse) {
    throw new Error('Course not found in member program');
  }

  const completed = parseCourseSlugList(dbUser.coursesCompleted);
  if (completed.includes(matchedCourse.slug)) {
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

  await prisma.user.update({
    where: { id: args.userId },
    data: { coursesCompleted: updated },
  });

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
