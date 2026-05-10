import 'server-only';

import { CourseProgressStatus } from '@prisma/client';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  averageProgramProgressFromB4B,
  filterRecognizedCourseraCourseIds,
  type LearnerProgressByContent,
} from '@/lib/coursera/learnerProgress';
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
 *
 * `b4bProgress` is an optional enrichment from Coursera For Business
 * (`fetchLearnerProgressFromB4B`). When supplied AND every catalog course
 * has a Coursera courseId AND every courseId appears in the B4B map, we
 * use the average B4B `overallProgress` as the program % — Coursera is
 * the authoritative source. We fall back to the local rollup whenever
 * B4B data is incomplete to avoid mixing fresh and stale numbers in the
 * same average. Course-level completion still comes from local rows so
 * existing "Mark complete" + xAPI behavior is unchanged.
 */
export async function loadMemberProgramTrainingView(args: {
  userId: string;
  programSlug: string;
  coursesCompletedJson?: unknown;
  b4bProgress?: LearnerProgressByContent;
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

  // Build a slug→Coursera courseId map so we can fall back to the B4B
  // `isCompleted` / `overallProgress` signal when the local CourseProgress
  // row hasn't been seeded yet (never-synced learner — see #1076 / #1079).
  // This is what makes the dashboard hero ring render correctly on a
  // member's first visit before any auto-sync writes have landed.
  const discovered = DISCOVERED_COURSERA_PROGRAMS[args.programSlug];
  const courseraIdBySlug = new Map<string, string>();
  if (discovered) {
    for (const c of discovered.courses) {
      if (c.courseId && !c.courseId.startsWith('TODO_')) {
        courseraIdBySlug.set(c.slug, c.courseId);
      }
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
    const courseraId = courseraIdBySlug.get(c.slug);
    const b4bEntry =
      args.b4bProgress && courseraId ? args.b4bProgress.get(courseraId) : undefined;

    // Local row wins for completion when present (xAPI / "Mark complete"
    // are the system of record). B4B is the fallback for users who haven't
    // been synced yet — first dashboard hit, no local rows, but Coursera
    // reports progress.
    const complete =
      row?.status === CourseProgressStatus.COMPLETED ||
      (row == null && b4bEntry?.isCompleted === true);

    const localPct = row?.percentComplete ?? 0;
    const b4bPct = b4bEntry?.overallProgress ?? 0;
    const pct = Math.max(localPct, row == null ? b4bPct : 0);
    sumPercentForAverage += Math.max(0, Math.min(100, pct));

    const started =
      complete ||
      row?.status === CourseProgressStatus.IN_PROGRESS ||
      localPct > 0 ||
      // B4B started signal only counts when no local row exists yet.
      (row == null && b4bPct > 0);

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
    // Authoritative B4B average wins when present and complete (every
    // course in the catalog has a Coursera id AND a row in the B4B
    // response). See loadMemberProgramTrainingView jsdoc for the
    // all-or-nothing rationale.
    const b4bAverage = args.b4bProgress
      ? averageProgramProgressFromB4B({
          progress: args.b4bProgress,
          courseraCourseIds: filterRecognizedCourseraCourseIds(
            (DISCOVERED_COURSERA_PROGRAMS[args.programSlug]?.courses ?? []).map((c) => c.courseId),
          ),
        })
      : null;

    if (b4bAverage != null) {
      progressPercentDisplay = Math.max(0, Math.min(100, b4bAverage));
    } else if (rows.length > 0) {
      // CourseProgress rows are the source of truth — `MemberProgramProgress`
      // is a denormalized cache that periodically goes stale (the writer in
      // `refreshMemberProgramProgressRollup` divides by the discovered-catalog
      // course count, which can disagree with `program.courses.length` here
      // and produce a 0 even when underlying rows show 6%). When we have
      // rows, compute from them directly and treat the rollup as a fallback
      // for the rare case where the writer ran but rows haven't synced into
      // this read transaction yet.
      //
      // Floor at 1% when the learner has any real progress so a member with
      // 6% on 1 of 16 courses (raw avg = 0.375%, round = 0%) doesn't see
      // "0% Overall" while their course card simultaneously shows 6%. Capped
      // at 100; only kicks in when sumPercentForAverage > 0.
      const raw = sumPercentForAverage / totalCourses;
      const rounded = Math.round(raw);
      progressPercentDisplay =
        rounded === 0 && sumPercentForAverage > 0 ? 1 : Math.max(0, Math.min(100, rounded));
    } else if (rollup != null) {
      progressPercentDisplay = Math.max(0, Math.min(100, rollup.averagePercent));
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
