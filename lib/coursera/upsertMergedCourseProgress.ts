import { CourseProgressStatus, type Prisma } from '@prisma/client';

import type { ExistingCourseProgress, MergedCourseProgress } from '@/lib/coursera/b4bSync';

type DbClient = Prisma.TransactionClient | {
  courseProgress: Prisma.TransactionClient['courseProgress'];
};

export type UpsertMergedCourseProgressArgs = {
  userId: string;
  programSlug: string;
  courseSlug: string;
  courseId: string;
  merged: MergedCourseProgress;
  existing: ExistingCourseProgress | null;
  /** Stamped on create when merged is COMPLETED; on update only when transitioning into COMPLETED. */
  completedAt: Date | null;
  scoreScaled?: number | null;
  startedAt?: Date | null;
  /** When set, applied on update only (B4B enrolledAt re-sync). */
  updateStartedAt?: Date | null;
};

export type UpsertMergedCourseProgressResult = {
  newlyCompleted: boolean;
};

/**
 * Single write path for B4B-sourced CourseProgress upserts after
 * `computeCourseProgressUpdate`. Keeps create/update/completedAt rules in one place.
 */
export async function upsertMergedCourseProgress(
  db: DbClient,
  args: UpsertMergedCourseProgressArgs,
): Promise<UpsertMergedCourseProgressResult> {
  const {
    userId,
    programSlug,
    courseSlug,
    courseId,
    merged,
    existing,
    completedAt,
    scoreScaled,
    startedAt,
    updateStartedAt,
  } = args;

  const newlyCompleted =
    merged.status === CourseProgressStatus.COMPLETED &&
    existing?.status !== CourseProgressStatus.COMPLETED;

  await db.courseProgress.upsert({
    where: {
      userId_programSlug_courseSlug: {
        userId,
        programSlug,
        courseSlug,
      },
    },
    create: {
      userId,
      programSlug,
      courseSlug,
      courseId,
      status: merged.status,
      percentComplete: merged.percentComplete,
      ...(scoreScaled != null ? { scoreScaled } : {}),
      ...(startedAt != null ? { startedAt } : {}),
      completedAt,
      lastActivityAt: merged.lastActivityAt,
    },
    update: {
      courseId,
      status: merged.status,
      percentComplete: merged.percentComplete,
      ...(scoreScaled != null ? { scoreScaled } : {}),
      ...(updateStartedAt != null ? { startedAt: updateStartedAt } : {}),
      ...(newlyCompleted && completedAt != null ? { completedAt } : {}),
      lastActivityAt: merged.lastActivityAt,
    },
  });

  return { newlyCompleted };
}
