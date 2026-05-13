import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getProgramBySlug } from '@/lib/content/programs';
import type { LearnerProgressByContent } from '@/lib/coursera/learnerProgress';
import { scoreScaledToDisplayPercent } from '@/lib/coursera/courseGradeDisplay';
import { prisma } from '@/lib/db/prisma';
import { loadProgramCourses } from '@/lib/member/loadProgramCourses';

/** Days without training activity before we surface counselor escalation on the dashboard. */
export const STALE_TRAINING_ACTIVITY_DAYS = 14;

export type MemberProgramTrainingView = {
  completedCount: number;
  totalCourses: number;
  /** Blended 0–100: mean of per-course % — prefers B4B `overallProgress` when present, else local/xAPI `CourseProgress`. */
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
  /** Mean of catalog-course grades where `CourseProgress.score_scaled` is set (xAPI / B4B / CSV promote). */
  averageGradePercentDisplay: number | null;
  /** Catalog slugs that count as fully complete for UI (CourseProgress wins over stale JSON). */
  completedSlugsAuthoritative: string[];
};

/**
 * Single source of truth for member-facing training counts, overall %, and activity timestamps.
 *
 * Coursera B4B `enrollmentReports` (`overallProgress`, `isCompleted`) is the primary
 * signal for completion percentage when `b4bProgress` includes a row for that course.
 * Local `CourseProgress` (fed by xAPI sync, webhooks, CSV, manual actions) supplies
 * fallback % when B4B has no row, plus grades (`score_scaled`). xAPI remains the audit /
 * event stream; this helper intentionally prefers B4B for member-visible % so the portal
 * matches what Coursera shows inside the enterprise shell.
 */
export async function loadMemberProgramTrainingView(args: {
  userId: string;
  programSlug: string;
  coursesCompletedJson?: unknown;
  b4bProgress?: LearnerProgressByContent;
}): Promise<MemberProgramTrainingView | null> {
  const program = getProgramBySlug(args.programSlug);
  if (!program) return null;

  // Resolve the user's organization once so we can ask `loadProgramCourses`
  // for the authoritative course list (B4B live → Course DB → static
  // catalog fallback). The static `program.courses` is the absolute last
  // resort for unseeded orgs without B4B credentials.
  const userRow = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { organizationId: true },
  });
  const liveCourses = userRow?.organizationId
    ? await loadProgramCourses({
        organizationId: userRow.organizationId,
        programSlug: args.programSlug,
        programTitleOverride: program.title,
      })
    : null;
  const courseList = liveCourses ?? program.courses;

  const [rows, rollup] = await Promise.all([
    prisma.courseProgress.findMany({
      take: 5000,
      where: { userId: args.userId, programSlug: args.programSlug },
      select: {
        courseSlug: true,
        status: true,
        percentComplete: true,
        scoreScaled: true,
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

  // Build a slug→Coursera courseId map so we can fall back to the B4B
  // `isCompleted` / `overallProgress` signal when the local CourseProgress
  // row hasn't been seeded yet (never-synced learner — see #1076 / #1079).
  // Prefer ids carried by `courseList` (B4B-live or DB-sourced) and fall
  // back to the static DISCOVERED catalog when courseList came from the
  // static `program.courses` path that doesn't carry ids.
  const courseraIdBySlug = new Map<string, string>();
  for (const c of courseList) {
    if (c.courseraCourseId && !c.courseraCourseId.startsWith('TODO_')) {
      courseraIdBySlug.set(c.slug, c.courseraCourseId);
    }
  }
  if (courseraIdBySlug.size === 0) {
    const discovered = DISCOVERED_COURSERA_PROGRAMS[args.programSlug];
    if (discovered) {
      for (const c of discovered.courses) {
        if (c.courseId && !c.courseId.startsWith('TODO_')) {
          courseraIdBySlug.set(c.slug, c.courseId);
        }
      }
    }
  }

  const totalCourses = courseList.length;
  let completedCount = 0;
  let hasStartedTraining = false;
  let nextIncompleteCourseSlug: string | null = null;
  let nextIncompleteCourseName: string | null = null;
  const completedSlugsAuthoritative: string[] = [];

  let sumPercentForAverage = 0;
  let sumGradeDisplay = 0;
  let gradeCount = 0;

  for (const c of courseList) {
    const row = bySlug.get(c.slug);
    const courseraId = courseraIdBySlug.get(c.slug);
    const b4bEntry =
      args.b4bProgress && courseraId ? args.b4bProgress.get(courseraId) : undefined;

    const locallyCompleted = row?.status === CourseProgressStatus.COMPLETED;
    const b4bCompleted = b4bEntry?.isCompleted === true;
    const complete = locallyCompleted || b4bCompleted;

    const localPct = row?.percentComplete ?? 0;
    let pct: number;
    if (locallyCompleted || b4bCompleted) {
      pct = 100;
    } else if (b4bEntry != null) {
      pct = b4bEntry.overallProgress;
    } else {
      pct = localPct;
    }
    sumPercentForAverage += Math.max(0, Math.min(100, pct));

    const gradePct = scoreScaledToDisplayPercent(row?.scoreScaled ?? undefined);
    if (gradePct != null) {
      sumGradeDisplay += gradePct;
      gradeCount += 1;
    }

    const started =
      complete ||
      row?.status === CourseProgressStatus.IN_PROGRESS ||
      localPct > 0 ||
      (b4bEntry != null && (b4bEntry.overallProgress > 0 || b4bEntry.isCompleted));

    if (started) hasStartedTraining = true;
    if (complete) {
      completedCount += 1;
      completedSlugsAuthoritative.push(c.slug);
    } else if (!nextIncompleteCourseSlug) {
      nextIncompleteCourseSlug = c.slug;
      nextIncompleteCourseName = c.name;
    }
  }

  const averageGradePercentDisplay =
    gradeCount > 0 ? Math.round((sumGradeDisplay / gradeCount) * 100) / 100 : null;

  const allCoursesComplete = totalCourses > 0 && completedCount >= totalCourses;
  const hasCompletedFirstCourse = completedCount >= 1;

  let progressPercentDisplay = 0;
  if (totalCourses > 0) {
    const rawMean = sumPercentForAverage / totalCourses;
    let rounded = Math.round(rawMean);
    progressPercentDisplay =
      rounded === 0 && sumPercentForAverage > 0 ? 1 : Math.max(0, Math.min(100, rounded));

    const noLocalRows = rows.length === 0;
    const noB4b = !args.b4bProgress || args.b4bProgress.size === 0;
    if (
      progressPercentDisplay === 0 &&
      noLocalRows &&
      noB4b &&
      rollup != null &&
      rollup.averagePercent > 0
    ) {
      progressPercentDisplay = Math.max(0, Math.min(100, rollup.averagePercent));
    } else if (progressPercentDisplay === 0 && completedCount > 0) {
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
    averageGradePercentDisplay,
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
