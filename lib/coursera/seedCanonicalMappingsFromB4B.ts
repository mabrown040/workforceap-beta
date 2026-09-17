/**
 * B4B-driven canonical-mapping seeder (course-level).
 *
 * Pulls the org's flat content catalog from `listContents()` and, for
 * each Coursera Course, finds the matching `Program` in our static
 * catalog by comparing the Coursera course name against
 * `Program.courses[].name`. Upserts a `CourseraCanonicalCourseMapping`
 * for every match.
 *
 * Why course-level instead of program-level: our B4B org returns a
 * single umbrella program ("Workforce Advancement Project") and every
 * "program" in our static catalog is a Course or Specialization inside
 * it — not a B4B program peer. A program-level matcher never resolves.
 * Going course-level lets us bind real Coursera ids to our catalog
 * regardless of how the umbrella is structured upstream.
 *
 * Idempotent — upserts on the unique `courseraCourseId` column.
 *
 * `matchCourseToCatalog` is pure so it can be unit-tested without the
 * `'server-only'` import chain.
 */
import { prisma } from '@/lib/db/prisma';
import { findLearningPathById } from '@/lib/content/coursera/learningPaths';
import { PROGRAMS, type Program, type ProgramCourse } from '@/lib/content/programs';
import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';
import { courseraCourseIdLookupVariants } from '@/lib/coursera/canonicalMapping';

export type B4BCourseSeedInput = {
  id: string;
  slug: string | null;
  name: string;
  contentType?: string;
};

/**
 * Only Course-type entries are seeded; Specializations don't carry an
 * independently-trackable Coursera course id in this pipeline. A registered
 * Learning Path id is skipped whatever B4B labels it: the AI + Software
 * Developer path once landed here as a "course-17" mapping because its
 * certificate name matched a catalog course name. Pure, for unit tests.
 */
export function selectSeedableB4BContents<T extends B4BCourseSeedInput>(
  contents: readonly T[],
): T[] {
  return contents.filter(
    (c) =>
      (!c.contentType || c.contentType === 'Course')
      && !findLearningPathById(c.id),
  );
}

export type B4BCourseSeedResult = {
  courseraCourseId: string;
  courseraCourseSlug: string | null;
  courseraName: string;
  canonicalProgramSlug: string | null;
  canonicalCourseSlug: string | null;
  matchKind: 'name' | 'unmatched';
  /**
   * `conflict`: a row already exists for this course with a DIFFERENT
   * canonical target. The seeder leaves it alone and reports it here; the
   * stored target is what `canonicalProgramSlug` / `canonicalCourseSlug`
   * carry in that case, since that is what the platform actually uses.
   */
  action: 'created' | 'updated' | 'skipped' | 'conflict';
};

export type B4BSeedSummary = {
  contentsScanned: number;
  coursesScanned: number;
  coursesMatched: number;
  coursesUnmatched: number;
  totalCreated: number;
  totalUpdated: number;
  /**
   * Courses whose stored mapping disagrees with the catalog name-match. Never
   * silently overwritten — surfaced so a human decides. Two crons run this
   * seeder, and "latest write wins" was how the catalog-vs-B4B disagreements
   * flipped back and forth unnoticed.
   */
  totalConflicts: number;
  /** First 50 per-course results, for the admin UI breakdown. Skip is
   *  applied to results returned to the API to keep the payload small. */
  perCourse: B4BCourseSeedResult[];
};

export type SeedWritePlan =
  | { action: 'create' }
  | { action: 'update' }
  | { action: 'conflict'; existingProgramSlug: string; existingCourseSlug: string };

/**
 * Decide what the seeder may write for one course, given whatever row is
 * already stored for it (under any id spelling) and the catalog name-match.
 *
 * The rule: never overwrite a differing canonical target. The name-match is a
 * heuristic; an existing row may be admin-curated or catalog-seeded, and this
 * seeder runs from two crons. Flipping a mapping on every run is how the
 * catalog-vs-B4B disagreements went unnoticed — so a differing target is
 * reported as a conflict for a human to settle, and only the provider slug is
 * refreshed on rows that already agree.
 */
export function planSeedWrite(
  existing: { canonicalProgramSlug: string; canonicalCourseSlug: string } | null,
  match: { programSlug: string; courseSlug: string },
): SeedWritePlan {
  if (!existing) return { action: 'create' };
  if (
    existing.canonicalProgramSlug === match.programSlug &&
    existing.canonicalCourseSlug === match.courseSlug
  ) {
    return { action: 'update' };
  }
  return {
    action: 'conflict',
    existingProgramSlug: existing.canonicalProgramSlug,
    existingCourseSlug: existing.canonicalCourseSlug,
  };
}

function normalizeCourseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Find the catalog (Program, ProgramCourse) pair whose course name
 * normalizes to the same string as the B4B course name. First match
 * wins — the static catalog has one course per (program, course) so
 * collisions across programs are vanishingly rare in practice.
 */
export function matchCourseToCatalog(
  b4bCourseName: string,
  catalog: Program[] = PROGRAMS,
): { program: Program; course: ProgramCourse } | null {
  const target = normalizeCourseName(b4bCourseName);
  if (!target) return null;
  for (const program of catalog) {
    for (const course of program.courses) {
      if (normalizeCourseName(course.name) === target) {
        return { program, course };
      }
    }
  }
  return null;
}

export async function seedCanonicalMappingsFromB4B(args: {
  contents: B4BCourseSeedInput[];
  actorUserId?: string | null;
}): Promise<B4BSeedSummary> {
  const actorUserId = args.actorUserId ?? null;
  const contents = args.contents;

  const summary: B4BSeedSummary = {
    contentsScanned: contents.length,
    coursesScanned: 0,
    coursesMatched: 0,
    coursesUnmatched: 0,
    totalCreated: 0,
    totalUpdated: 0,
    totalConflicts: 0,
    perCourse: [],
  };

  const courses = selectSeedableB4BContents(contents);
  summary.coursesScanned = courses.length;

  for (const c of courses) {
    // Store the bare id. listContents hands us `Course~<id>` while progress
    // rows carry `<id>`; seeding the prefixed form is what produced 130
    // mapping rows the promotion lookup could never match.
    const courseraCourseId = normalizeCourseraCourseId(c.id);
    const courseraCourseSlug = c.slug?.trim() || null;
    if (!courseraCourseId) continue;

    const match = matchCourseToCatalog(c.name);
    if (!match) {
      summary.coursesUnmatched += 1;
      if (summary.perCourse.length < 50) {
        summary.perCourse.push({
          courseraCourseId,
          courseraCourseSlug,
          courseraName: c.name,
          canonicalProgramSlug: null,
          canonicalCourseSlug: null,
          matchKind: 'unmatched',
          action: 'skipped',
        });
      }
      continue;
    }

    summary.coursesMatched += 1;

    // Look under every spelling so a prefixed twin left by an earlier seed is
    // seen, and prefer the bare row — the one the lookup prefers too.
    const existingRows = await prisma.courseraCanonicalCourseMapping.findMany({
      where: { courseraCourseId: { in: courseraCourseIdLookupVariants(courseraCourseId) } },
      select: { courseraCourseId: true, canonicalProgramSlug: true, canonicalCourseSlug: true },
    });
    const bareExisting = existingRows.find((row) => row.courseraCourseId === courseraCourseId);
    const existing = bareExisting ?? existingRows[0] ?? null;

    const plan = planSeedWrite(existing, {
      programSlug: match.program.slug,
      courseSlug: match.course.slug,
    });

    if (plan.action === 'conflict') {
      summary.totalConflicts += 1;
      if (summary.perCourse.length < 50) {
        summary.perCourse.push({
          courseraCourseId,
          courseraCourseSlug,
          courseraName: c.name,
          canonicalProgramSlug: plan.existingProgramSlug,
          canonicalCourseSlug: plan.existingCourseSlug,
          matchKind: 'name',
          action: 'conflict',
        });
      }
      continue;
    }

    // Upsert on the bare id so the table converges to one spelling. `update`
    // refreshes only the provider slug: the canonical target on an existing
    // row is never touched here (see planSeedWrite), and a prefixed twin is
    // left in place for a separate, deliberate cleanup rather than deleted
    // from inside a cron.
    await prisma.courseraCanonicalCourseMapping.upsert({
      where: { courseraCourseId },
      create: {
        courseraCourseId,
        courseraCourseSlug,
        canonicalProgramSlug: match.program.slug,
        canonicalCourseSlug: match.course.slug,
        notes: 'Auto-seeded from B4B listContents (course-name match)',
        createdById: actorUserId,
      },
      update: {
        courseraCourseSlug,
        // Don't touch notes/createdById on update — preserve manual edits.
      },
    });

    const action: 'created' | 'updated' = bareExisting ? 'updated' : 'created';
    if (bareExisting) {
      summary.totalUpdated += 1;
    } else {
      summary.totalCreated += 1;
    }

    if (summary.perCourse.length < 50) {
      summary.perCourse.push({
        courseraCourseId,
        courseraCourseSlug,
        courseraName: c.name,
        canonicalProgramSlug: match.program.slug,
        canonicalCourseSlug: match.course.slug,
        matchKind: 'name',
        action,
      });
    }
  }

  return summary;
}
