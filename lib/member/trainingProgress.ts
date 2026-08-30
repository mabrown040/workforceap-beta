import { getProgramBySlug } from '@/lib/content/programs';
import { programSlugsEquivalent } from '@/lib/content/programSlug';
import { LEGACY_CURRICULUM_VERSION } from '@/lib/content/programCurriculumManifest';
import { getProgramCoursesForCurriculumVersion } from '@/lib/member/curriculumAssignment';

export type TrainingProgress = {
  totalCourses: number;
  completedCount: number;
  pct: number;
  allComplete: boolean;
};

export type LiveTrainingProgressSummary = {
  programSlug: string;
  averagePercent: number;
  coursesCompleted: number;
} | null | undefined;

export type TrainingProgressEnrollment = {
  programSlug: string;
  curriculumVersion: string;
  isPrimary: boolean;
};

export type TrainingProgressAssignment = {
  programSlug: string | null;
  curriculumVersion: string | null;
};

/** Resolve the immutable version for one explicitly selected program. */
export function resolveTrainingProgressCurriculumVersion(
  programSlug: string | null | undefined,
  enrollments: readonly TrainingProgressEnrollment[],
): string | null {
  if (!programSlug) return null;
  const equivalentEnrollments = enrollments.filter((candidate) =>
    programSlugsEquivalent(candidate.programSlug, programSlug),
  );
  const enrollment =
    equivalentEnrollments.find((candidate) => candidate.isPrimary) ??
    equivalentEnrollments[0];
  if (enrollment) return enrollment.curriculumVersion;
  return enrollments.length === 0 ? LEGACY_CURRICULUM_VERSION : null;
}

export type ComputeTrainingProgressArgs = {
  enrolledProgram: string | null | undefined;
  curriculumVersion: string | null | undefined;
  coursesCompleted: unknown;
  liveProgress?: LiveTrainingProgressSummary | LiveTrainingProgressSummary[];
};

/**
 * Resolve the immutable curriculum assignment used by rollup-only readers.
 * A primary CourseEnrollment wins; older unmarked rows may match the legacy
 * User.enrolledProgram through canonical/alias equivalence. Legacy v1 is used
 * only when the learner has no CourseEnrollment rows at all.
 */
export function resolveTrainingProgressAssignment(
  enrolledProgram: string | null | undefined,
  enrollments: readonly TrainingProgressEnrollment[],
): TrainingProgressAssignment {
  const primary = enrollments.find((enrollment) => enrollment.isPrimary) ?? null;
  const equivalent = enrolledProgram
    ? enrollments.find((enrollment) =>
        programSlugsEquivalent(enrollment.programSlug, enrolledProgram),
      ) ?? null
    : null;
  const enrollment = primary ?? equivalent;

  if (enrollment) {
    return {
      programSlug: enrollment.programSlug,
      curriculumVersion: enrollment.curriculumVersion,
    };
  }

  if (enrollments.length === 0) {
    return {
      programSlug: enrolledProgram ?? null,
      curriculumVersion: LEGACY_CURRICULUM_VERSION,
    };
  }

  // Enrollment rows exist, but none can be identified as the active program.
  // Do not silently reinterpret one of those immutable assignments as legacy.
  return { programSlug: null, curriculumVersion: null };
}

function findLiveProgress(
  enrolledProgram: string | null | undefined,
  liveProgress?: LiveTrainingProgressSummary | LiveTrainingProgressSummary[]
) {
  if (!enrolledProgram) return null;
  return Array.isArray(liveProgress)
    ? liveProgress.find(
        (row) => row && programSlugsEquivalent(row.programSlug, enrolledProgram),
      ) ?? null
    : liveProgress && programSlugsEquivalent(liveProgress.programSlug, enrolledProgram)
      ? liveProgress
      : null;
}

/**
 * Compute a member's training progress as a 0–100 percentage of completed
 * courses against the courses defined for their enrolled program.
 *
 * Returns pct = 0 when the member is not enrolled, the program has no
 * courses, or coursesCompleted is empty/malformed. Only counts course
 * slugs that belong to the enrolled program — stale entries from a prior
 * program do not inflate the percentage.
 */
export function computeTrainingProgress({
  enrolledProgram,
  curriculumVersion,
  coursesCompleted,
  liveProgress,
}: ComputeTrainingProgressArgs): TrainingProgress {
  const program = enrolledProgram && curriculumVersion
    ? getProgramBySlug(enrolledProgram)
    : null;
  const courses = program
    ? getProgramCoursesForCurriculumVersion(program, curriculumVersion)
    : [];
  const totalCourses = courses.length;
  if (totalCourses === 0) {
    return { totalCourses: 0, completedCount: 0, pct: 0, allComplete: false };
  }

  const rollup = findLiveProgress(enrolledProgram, liveProgress);
  if (rollup) {
    const rawCompletedCount = rollup.coursesCompleted;
    const hasValidCompletedCount = Number.isFinite(rawCompletedCount)
      && Number.isInteger(rawCompletedCount)
      && rawCompletedCount >= 0;
    const completedCount = Math.max(
      0,
      Math.min(totalCourses, hasValidCompletedCount ? rawCompletedCount : 0),
    );
    const allComplete = hasValidCompletedCount && rawCompletedCount === totalCourses;
    const reportedPercent = Math.max(0, Math.min(100, Math.round(rollup.averagePercent)));
    // A pre-validation rollup can contain a 100% aggregate from one course
    // while the catalog denominator has several courses. Never let that stale
    // aggregate imply program completion; fall back to the only defensible
    // aggregate available from this legacy shape.
    const pct = reportedPercent === 100 && !allComplete
      ? Math.round((completedCount / totalCourses) * 100)
      : reportedPercent;
    return {
      totalCourses,
      completedCount,
      pct,
      allComplete,
    };
  }

  const list = Array.isArray(coursesCompleted) ? (coursesCompleted as unknown[]) : [];
  const completedSlugs = new Set(list.filter((s): s is string => typeof s === 'string'));
  const completedCount = courses.filter((c) => completedSlugs.has(c.slug)).length;
  const pct = Math.round((completedCount / totalCourses) * 100);
  return {
    totalCourses,
    completedCount,
    pct,
    allComplete: completedCount === totalCourses,
  };
}

/**
 * Threshold used by the admin Job-ready queue. A member is considered
 * job-ready when training progress crosses 70%, per the 2026-04-27 dad
 * review backlog. Distinct from interview-ready (which is gated by
 * pre-screening completion via the `interviewEligible` flag).
 */
export const JOB_READY_TRAINING_PCT = 70;
