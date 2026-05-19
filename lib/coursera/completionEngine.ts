import 'server-only';

import { prisma } from '@/lib/db/prisma';

export type UpsertCourseraEnrollmentProgressInput = {
  userId: string;
  courseId: string;
  progressPercent: number;
  completed?: boolean;
  enrolledAt?: Date;
};

function clampProgressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Idempotent upsert for Coursera completion webhook payloads.
 * Monotonic progress: stored percent never decreases unless completion is set.
 */
export async function upsertCourseraEnrollmentProgress(
  input: UpsertCourseraEnrollmentProgressInput
) {
  const progressPercent = clampProgressPercent(input.progressPercent);
  const shouldComplete = input.completed === true || progressPercent >= 100;
  const enrolledAt = input.enrolledAt ?? new Date();
  const completedAt = shouldComplete ? new Date() : null;

  const existing = await prisma.courseraEnrollment.findUnique({
    where: {
      userId_courseId: {
        userId: input.userId,
        courseId: input.courseId,
      },
    },
    select: {
      id: true,
      lastProgressPct: true,
      completedAt: true,
      enrolledAt: true,
    },
  });

  if (!existing) {
    return prisma.courseraEnrollment.create({
      data: {
        userId: input.userId,
        courseId: input.courseId,
        enrolledAt,
        lastProgressPct: progressPercent,
        completedAt,
      },
    });
  }

  const nextProgress = Math.max(existing.lastProgressPct, progressPercent);
  const nextCompletedAt = existing.completedAt ?? completedAt;

  return prisma.courseraEnrollment.update({
    where: { id: existing.id },
    data: {
      lastProgressPct: nextProgress,
      completedAt: nextCompletedAt,
    },
  });
}
