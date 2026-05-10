import 'server-only';

import type { ProgramCourse } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';

/**
 * Load a program's course list from the live `Course` table for an org.
 *
 * Per CEO call (2026-05-10): the dashboard should rely on the real
 * Coursera-synced DB rows, not the in-memory `PROGRAMS` static catalog
 * (whose `courses` array is currently overridden by the static
 * `DISCOVERED_COURSERA_PROGRAMS` file in `mkProgram`). Using the DB
 * means: admin sync from Coursera B4B → `Course` rows → reflected on
 * dashboard immediately, without needing a code deploy of a static
 * file.
 *
 * Returns rows ordered by `displayOrder ASC`. Maps to the existing
 * `ProgramCourse` shape so call sites that pass this to TrainingCourseList
 * don't need to change.
 *
 * Returns `null` when no rows exist for the (org, program) pair —
 * signal to the caller to fall back to the static catalog so unseeded
 * orgs (fresh installs, demo) still render. Run `scripts/backfill-courses.ts`
 * to populate.
 */
export async function loadProgramCoursesFromDb(args: {
  organizationId: string;
  programSlug: string;
}): Promise<ProgramCourse[] | null> {
  const rows = await prisma.course.findMany({
    where: {
      organizationId: args.organizationId,
      programSlug: args.programSlug,
    },
    orderBy: { displayOrder: 'asc' },
    select: {
      courseSlug: true,
      name: true,
      estimatedHours: true,
      courseraCourseId: true,
    },
  });

  if (rows.length === 0) return null;

  return rows.map((row) => ({
    slug: row.courseSlug,
    name: row.name,
    estimatedHours: row.estimatedHours ?? 10,
    courseraCourseId: row.courseraCourseId ?? undefined,
  }));
}
