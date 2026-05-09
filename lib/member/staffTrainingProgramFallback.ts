import 'server-only';

import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';

/**
 * When platform staff (super_admin / admin) open member training surfaces without
 * a CourseEnrollment, we still render a real program catalog so course cards +
 * B4B keys stay consistent. Prefer any program already present in their
 * `course_progress` rows; otherwise fall back to a stable catalog default.
 */
export const STAFF_TRAINING_PREVIEW_PROGRAM_SLUG = 'comptia-a-professional-certificate';

export async function resolveStaffTrainingPreviewProgramSlug(userId: string): Promise<string | null> {
  const fromProgress = await prisma.courseProgress.findFirst({
    where: { userId },
    orderBy: { lastUpdatedAt: 'desc' },
    select: { programSlug: true },
  });
  if (fromProgress?.programSlug && getProgramBySlug(fromProgress.programSlug)) {
    return fromProgress.programSlug;
  }
  return getProgramBySlug(STAFF_TRAINING_PREVIEW_PROGRAM_SLUG) ? STAFF_TRAINING_PREVIEW_PROGRAM_SLUG : null;
}
