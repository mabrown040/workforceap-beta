import 'server-only';

import type { ProgramCourse } from '@/lib/content/programs';
import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import { loadProgramCoursesFromB4B } from '@/lib/coursera/programContentsCache';
import { isUmbrellaB4BProgramId } from '@/lib/coursera/programCourseList';

/**
 * Resolve a program's course list with the right authority order:
 *
 *   1. **B4B live API** only for a genuine per-program id. The WorkforceAP
 *      organization currently uses one shared umbrella id, whose contents
 *      must never become every program's denominator.
 *   2. **`Course` DB table** — synced from B4B by an admin job (or by
 *      `scripts/backfill-courses.ts`). The cache layer when B4B is
 *      momentarily unavailable.
 *   3. **null** — caller decides whether to fall back further (typically
 *      `program.courses` static catalog).
 *
 * This order is what makes "all courses rely on the real Coursera DB"
 * actually true at runtime: a Coursera-side change is reflected within
 * the cache window, no code redeploy required.
 */
export async function loadProgramCourses(args: {
  organizationId: string;
  programSlug: string;
  /** Override the program title used for B4B name matching. Defaults to
   *  `getProgramBySlug(programSlug)?.title`. */
  programTitleOverride?: string;
  /** Release-audit mode must not mint Coursera OAuth tokens or warm the
   * process-level B4B cache while a supposedly read-only page is inspected. */
  readOnlyAudit?: boolean;
}): Promise<ProgramCourse[] | null> {
  const program = getProgramBySlug(args.programSlug);
  const title = args.programTitleOverride ?? program?.title ?? null;

  // 1. B4B live (cached). Resolution order inside the B4B index:
  //    a. Program.courseraB4BProgramId — explicit manual override paste-able
  //       from /admin/coursera "List B4B programs" (added in #1158). Wins
  //       when set so a renamed WAP program doesn't silently match the
  //       wrong Coursera program.
  //    b. slug equality (rare; only when our slug coincidentally matches
  //       Coursera's).
  //    c. normalized program title — automatic primary path.
  const programB4BId = program?.courseraB4BProgramId ?? null;
  const fromB4B = args.readOnlyAudit || !programB4BId || isUmbrellaB4BProgramId(programB4BId)
    ? null
    : await loadProgramCoursesFromB4B({
        programId: programB4BId,
        slug: args.programSlug,
        title,
      });
  if (fromB4B && fromB4B.length > 0) return fromB4B;

  // 2. Course DB table. Per-org rows keyed by (orgId, programSlug).
  const dbRows = await prisma.course.findMany({
    take: 500,
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
  if (dbRows.length > 0) {
    return dbRows.map((row) => ({
      slug: row.courseSlug,
      name: row.name,
      estimatedHours: row.estimatedHours ?? 10,
      courseraCourseId: row.courseraCourseId ?? undefined,
    }));
  }

  // 3. Caller decides what to do.
  return null;
}

/**
 * Convenience wrapper: returns the course count for a program with the
 * same authority order. Used by `refreshMemberProgramProgressRollup`
 * and `loadMemberProgramTrainingView` so the rollup denominator and
 * the dashboard's "x / y" header stay consistent with what the user
 * sees on the page.
 */
export async function loadProgramCourseCount(args: {
  organizationId: string;
  programSlug: string;
  readOnlyAudit?: boolean;
}): Promise<number> {
  const courses = await loadProgramCourses(args);
  if (courses) return courses.length;
  // Fall back to static catalog count to avoid 0-division on the rare
  // unseeded org where B4B is also down.
  return getProgramBySlug(args.programSlug)?.courses.length ?? 0;
}
