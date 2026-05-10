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
import { PROGRAMS, type Program, type ProgramCourse } from '@/lib/content/programs';

export type B4BCourseSeedInput = {
  id: string;
  slug: string | null;
  name: string;
  contentType?: string;
};

export type B4BCourseSeedResult = {
  courseraCourseId: string;
  courseraCourseSlug: string | null;
  courseraName: string;
  canonicalProgramSlug: string | null;
  canonicalCourseSlug: string | null;
  matchKind: 'name' | 'unmatched';
  action: 'created' | 'updated' | 'skipped';
};

export type B4BSeedSummary = {
  contentsScanned: number;
  coursesScanned: number;
  coursesMatched: number;
  coursesUnmatched: number;
  totalCreated: number;
  totalUpdated: number;
  /** First 50 per-course results, for the admin UI breakdown. Skip is
   *  applied to results returned to the API to keep the payload small. */
  perCourse: B4BCourseSeedResult[];
};

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
    perCourse: [],
  };

  // We only seed Course-type entries; Specializations don't carry an
  // independently-trackable Coursera course id in this pipeline.
  const courses = contents.filter(
    (c) => !c.contentType || c.contentType === 'Course',
  );
  summary.coursesScanned = courses.length;

  for (const c of courses) {
    const courseraCourseId = c.id?.trim();
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

    const existing = await prisma.courseraCanonicalCourseMapping.findUnique({
      where: { courseraCourseId },
      select: { id: true },
    });

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
        canonicalProgramSlug: match.program.slug,
        canonicalCourseSlug: match.course.slug,
        // Don't touch notes/createdById on update — preserve manual edits.
      },
    });

    const action: 'created' | 'updated' = existing ? 'updated' : 'created';
    if (existing) {
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
