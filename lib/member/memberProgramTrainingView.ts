import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';

/** Days without training activity before we surface counselor escalation on the dashboard. */
export const STALE_TRAINING_ACTIVITY_DAYS = 14;

export type MemberProgramTrainingView = {
  completedCount: number;
  totalCourses: number;
  /** Blended 0–100: prefers `MemberProgramProgress.averagePercent`, else mean of per-course %, else completion ratio. */
  progressPercentDisplay: number;
  allCoursesComplete: boolean;
  nextIncompleteCourseSlug: string | null;
  nextIncompleteCourseName: string | null;
  /** Any course started, in progress, or completed in canonical progress rows. */
  hasStartedTraining: boolean;
  /** At least one catalog course counts as fully complete (CourseProgress.COMPLETED). */
  hasCompletedFirstCourse: boolean;
  /** Latest touch from `CourseProgress` / rollup; null if no rows exist yet. */
  lastTrainingActivityAt: Date | null;
  /** Catalog slugs that count as fully complete for UI (CourseProgress wins over stale JSON). */
  completedSlugsAuthoritative: string[];
};

/**
 * Single source of truth for member training counts and activity timestamps.
 * Course rows from xAPI / manual completion are the canonical source.
 */
export async function loadMemberProgramTrainingView(args: {
  userId: string;
  programSlug: string;
  coursesCompletedJson?: unknown;
}): Promise<MemberProgramTrainingView | null> {
  const program = getProgramBySlug(args.programSlug);
  if (!program) return null;

  const [rows, rollup] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: args.userId, programSlug: args.programSlug },
      select: {
        courseSlug: true,
        status: true,
        percentComplete: true,
        lastUpdatedAt: true,
      },
    }),
    prisma.memberProgramProgress.findUnique({
      where: {
        userId_programSlug: { userId: args.userId, programSlug: args.programSlug },
      },
      select: { coursesCompleted: true, averagePercent: true, lastUpdatedAt: true },
    }),
  ]);

  const bySlug = new Map(rows.map((r) => [r.courseSlug, r]));

  let lastTrainingActivityAt: Date | null = null;
  for (const r of rows) {
    if (!lastTrainingActivityAt || r.lastUpdatedAt > lastTrainingActivityAt) {
      lastTrainingActivityAt = r.lastUpdatedAt;
    }
  }
  if (rollup?.lastUpdatedAt) {
    if (!lastTrainingActivityAt || rollup.lastUpdatedAt > lastTrainingActivityAt) {
      lastTrainingActivityAt = rollup.lastUpdatedAt;
    }
  }

  const totalCourses = program.courses.length;
  let completedCount = 0;
  let hasStartedTraining = false;
  let nextIncompleteCourseSlug: string | null = null;
  let nextIncompleteCourseName: string | null = null;
  const completedSlugsAuthoritative: string[] = [];

  let sumPercentForAverage = 0;

  for (const c of program.courses) {
    const row = bySlug.get(c.slug);
    const complete =
      row != null
        ? row.status === CourseProgressStatus.COMPLETED
        : false;

    const pct = row?.percentComplete ?? 0;
    sumPercentForAverage += Math.max(0, Math.min(100, pct));

    const started =
      complete ||
      row?.status === CourseProgressStatus.IN_PROGRESS ||
      pct > 0;

    if (started) hasStartedTraining = true;
    if (complete) {
      completedCount += 1;
      completedSlugsAuthoritative.push(c.slug);
    } else if (!nextIncompleteCourseSlug) {
      nextIncompleteCourseSlug = c.slug;
      nextIncompleteCourseName = c.name;
    }
  }

  const allCoursesComplete = totalCourses > 0 && completedCount >= totalCourses;
  const hasCompletedFirstCourse = completedCount >= 1;

  let progressPercentDisplay = 0;
  if (totalCourses > 0) {
    if (rollup != null) {
      progressPercentDisplay = Math.max(0, Math.min(100, rollup.averagePercent));
    } else if (rows.length > 0) {
      progressPercentDisplay = Math.round(sumPercentForAverage / totalCourses);
    } else {
      progressPercentDisplay = Math.round((completedCount / totalCourses) * 100);
    }
  }

  return {
    completedCount,
    totalCourses,
    progressPercentDisplay,
    allCoursesComplete,
    nextIncompleteCourseSlug,
    nextIncompleteCourseName,
    hasStartedTraining,
    hasCompletedFirstCourse,
    lastTrainingActivityAt,
    completedSlugsAuthoritative,
  };
}

export function isTrainingStaleForCounselorEscalation(args: {
  trainingView: MemberProgramTrainingView;
  /** When the member became eligible to open training (e.g. max of enrolled and assessment done). */
  trainingEligibleSince: Date | null;
  allCoursesComplete: boolean;
  dashboardInTraining: boolean;
}): boolean {
  if (!args.dashboardInTraining || args.allCoursesComplete) return false;

  const staleMs = STALE_TRAINING_ACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const baseline = args.trainingView.lastTrainingActivityAt ?? args.trainingEligibleSince;
  if (!baseline) return false;

  return now - baseline.getTime() > staleMs;
}
