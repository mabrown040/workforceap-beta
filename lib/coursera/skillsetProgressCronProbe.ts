import 'server-only';

import { fetchCourseraLearnerSkillsetProgress } from '@/lib/coursera/client';
import { getCourseraReadiness, resolveCourseraProgramId, resolveCourseraSkillsetIds } from '@/lib/coursera/config';
import { prisma } from '@/lib/db/prisma';

export type SkillsetCronProbeResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  skippedReason: string | null;
  /** When API returns data but we do not map skillsets → per-course rows yet. */
  note: string;
};

const PROBE_LIMIT = 20;

/**
 * Best-effort Coursera Enterprise skillset progress pull for a small sample of
 * enrolled members. Does not write `CourseProgress` today — skillset IDs are
 * not mapped to catalog course slugs (TODO: map + upsertCourseProgress).
 */
export async function runCourseraSkillsetProgressProbe(): Promise<SkillsetCronProbeResult> {
  const note =
    'Skillset API responses are counted in cron metadata only; per-course CourseProgress updates still come from xAPI statements until skillset→course mapping exists.';

  const readiness = getCourseraReadiness(null);
  if (!readiness.canSync) {
    return {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      skippedReason: `Coursera API not configured: ${readiness.syncMissing.join('; ')}`,
      note,
    };
  }

  const enrollments = await prisma.courseEnrollment.findMany({
    where: {
      user: { deletedAt: null },
    },
    select: {
      programSlug: true,
      user: { select: { id: true, email: true } },
    },
    take: PROBE_LIMIT,
    orderBy: { updatedAt: 'desc' },
  });

  let attempted = 0;
  let succeeded = 0;
  let failed = 0;

  for (const row of enrollments) {
    const programSlug = row.programSlug;
    const email = row.user.email?.trim();
    if (!email) continue;

    const programId = resolveCourseraProgramId(programSlug);
    const skillsetIds = resolveCourseraSkillsetIds(programSlug);
    if (!programId || skillsetIds.length === 0) continue;

    attempted += 1;
    try {
      await fetchCourseraLearnerSkillsetProgress({
        programId,
        email,
        skillsetIds,
      });
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    attempted,
    succeeded,
    failed,
    skippedReason: attempted === 0 ? 'No recent course enrollments with email + program mapping' : null,
    note,
  };
}
