/**
 * B4B-driven canonical-mapping seeder.
 *
 * Companion to `seedCanonicalMappingsFromCatalog.ts`. The catalog seeder
 * walks the local `courses` table and only covers programs we already
 * have Coursera ids typed in for. The B4B seeder fills the gap for
 * programs the catalog has never been hand-mapped for: it pulls every
 * program + course Coursera knows about (`listPrograms({ excludeContent:
 * false })`), matches each B4B program to a `Program` in the static
 * catalog (by explicit `courseraB4BProgramId`, then by normalized name),
 * and upserts a canonical mapping for every course inside the matched
 * program.
 *
 * Why this exists: 11 of 19 catalog programs had zero rows in
 * `coursera_canonical_course_mappings` as of 2026-05-10 because their
 * `courses` rows were never typed in. xAPI events for those programs
 * therefore land in `completion_status='ignored'` forever. Pulling B4B's
 * own program → course tree resolves the gap without manual data entry.
 *
 * Idempotent — upserts on the unique `courseraCourseId` column.
 *
 * Pure on the matcher (`matchB4BProgramToCatalog`) so the unit test can
 * import it without the `'server-only'` chain. The seeder itself
 * imports prisma but accepts the B4B program list as a parameter so the
 * caller (server wrapper) handles the live fetch.
 */
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS, type Program } from '@/lib/content/programs';

/** Minimal B4B program shape — accepted as a parameter to keep the seeder pure-ish. */
export type B4BProgramSeedInput = {
  id: string;
  slug: string | null;
  name: string;
  url?: string | null;
  courses: Array<{ id: string; slug: string; name: string }>;
};

export type B4BSeedProgramResult = {
  canonicalProgramSlug: string | null;
  b4bProgramId: string;
  b4bProgramName: string;
  matchKind: 'manualId' | 'name' | 'unmatched';
  scanned: number;
  created: number;
  updated: number;
  skippedNoCourseId: number;
};

export type B4BSeedSummary = {
  programsScanned: number;
  programsMatched: number;
  programsUnmatched: number;
  totalCreated: number;
  totalUpdated: number;
  perProgram: B4BSeedProgramResult[];
};

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Match a B4B program to a `Program` in the static catalog.
 *
 * Resolution order:
 *   1. `Program.courseraB4BProgramId === b4b.id` (admin-bound id)
 *   2. Normalized name equality
 *   3. null — caller surfaces the program in the "unmatched" list
 */
export function matchB4BProgramToCatalog(
  b4b: { id: string; name: string },
  catalog: Program[] = PROGRAMS,
): { program: Program; kind: 'manualId' | 'name' } | null {
  const byManualId = catalog.find((p) => p.courseraB4BProgramId === b4b.id);
  if (byManualId) return { program: byManualId, kind: 'manualId' };

  const target = normalizeName(b4b.name);
  if (!target) return null;
  const byName = catalog.find((p) => normalizeName(p.title) === target);
  if (byName) return { program: byName, kind: 'name' };

  return null;
}

export async function seedCanonicalMappingsFromB4B(args: {
  programs: B4BProgramSeedInput[];
  actorUserId?: string | null;
}): Promise<B4BSeedSummary> {
  const actorUserId = args.actorUserId ?? null;
  const b4bPrograms = args.programs;

  const summary: B4BSeedSummary = {
    programsScanned: b4bPrograms.length,
    programsMatched: 0,
    programsUnmatched: 0,
    totalCreated: 0,
    totalUpdated: 0,
    perProgram: [],
  };

  for (const b4b of b4bPrograms) {
    const match = matchB4BProgramToCatalog(b4b);
    const result: B4BSeedProgramResult = {
      canonicalProgramSlug: match?.program.slug ?? null,
      b4bProgramId: b4b.id,
      b4bProgramName: b4b.name,
      matchKind: match ? match.kind : 'unmatched',
      scanned: b4b.courses.length,
      created: 0,
      updated: 0,
      skippedNoCourseId: 0,
    };

    if (!match) {
      summary.programsUnmatched += 1;
      summary.perProgram.push(result);
      continue;
    }

    summary.programsMatched += 1;

    for (const course of b4b.courses) {
      const courseraCourseId = course.id?.trim();
      if (!courseraCourseId) {
        result.skippedNoCourseId += 1;
        continue;
      }
      const courseraCourseSlug = course.slug?.trim() || null;

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
          canonicalCourseSlug: courseraCourseSlug ?? course.id,
          notes: 'Auto-seeded from B4B listPrograms',
          createdById: actorUserId,
        },
        update: {
          courseraCourseSlug,
          canonicalProgramSlug: match.program.slug,
          canonicalCourseSlug: courseraCourseSlug ?? course.id,
        },
      });

      if (existing) {
        result.updated += 1;
        summary.totalUpdated += 1;
      } else {
        result.created += 1;
        summary.totalCreated += 1;
      }
    }

    summary.perProgram.push(result);
  }

  return summary;
}
