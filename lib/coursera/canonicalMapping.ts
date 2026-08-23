/**
 * Admin-curated `coursera_canonical_course_mappings` lookup helpers.
 *
 * Intentionally does NOT `import 'server-only'`: this lets `b4bSync.ts` (which
 * also avoids `server-only` so its pure helpers can run under `node --test`)
 * pull in `loadCanonicalMappingsForCourseraIds` without triggering
 * "Cannot find module 'server-only'" in the test runner. The exported
 * functions still touch the Prisma client, so they would never execute in a
 * browser bundle — `server-only` here would be cosmetic.
 *
 * `lib/member/programCourseMatch.ts` re-exports from this file for callers
 * that prefer the matching-resolver entry point.
 */

import { prisma } from '@/lib/db/prisma';
import { LOOKUP_CATALOG_CAP } from '@/lib/db/scanCaps';

/**
 * A canonical mapping row resolved to its (programSlug, courseSlug) pair.
 * The DB row carries more fields; this is the subset every caller needs.
 */
export type CanonicalMappingHit = {
  programSlug: string;
  courseSlug: string;
};

/**
 * Pre-loaded `coursera_canonical_course_mappings` rows keyed by both
 * `coursera_course_id` (primary) and `coursera_course_slug` (secondary).
 * Used by bulk callers (B4B sync loops) to avoid one DB round-trip per row.
 */
export type CanonicalMappingIndex = {
  byCourseraCourseId: Map<string, CanonicalMappingHit>;
  byCourseraCourseSlug: Map<string, CanonicalMappingHit>;
};

export function emptyCanonicalMappingIndex(): CanonicalMappingIndex {
  return {
    byCourseraCourseId: new Map(),
    byCourseraCourseSlug: new Map(),
  };
}

/**
 * Bulk-load `coursera_canonical_course_mappings` rows for a set of Coursera
 * courseIds. Empty input → empty index, no DB hit.
 *
 * Why batch: B4B sync iterates O(N) reports; a per-row `findFirst` would
 * burn one round-trip per course on every cron run. One IN-list query is
 * essentially free for the typical fewer-than-1000 mapping rows we have.
 */
export async function loadCanonicalMappingsForCourseraIds(
  ids: ReadonlyArray<string | null | undefined>,
): Promise<CanonicalMappingIndex> {
  const filtered = Array.from(
    new Set(
      ids
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value): value is string => value.length > 0),
    ),
  );
  if (filtered.length === 0) return emptyCanonicalMappingIndex();

  const rows = await prisma.courseraCanonicalCourseMapping.findMany({
    take: LOOKUP_CATALOG_CAP,
    where: { courseraCourseId: { in: filtered } },
    select: {
      courseraCourseId: true,
      courseraCourseSlug: true,
      canonicalProgramSlug: true,
      canonicalCourseSlug: true,
    },
  });

  const index = emptyCanonicalMappingIndex();
  for (const row of rows) {
    const hit: CanonicalMappingHit = {
      programSlug: row.canonicalProgramSlug,
      courseSlug: row.canonicalCourseSlug,
    };
    index.byCourseraCourseId.set(row.courseraCourseId, hit);
    if (row.courseraCourseSlug) {
      index.byCourseraCourseSlug.set(row.courseraCourseSlug, hit);
    }
  }
  return index;
}

/**
 * Look up a single admin-curated mapping by Coursera courseId (preferred)
 * or courseSlug. Hits `coursera_canonical_course_mappings` directly — only
 * use this on hot paths that handle a single course at a time (xAPI events,
 * single-course completion). For loops, use
 * `loadCanonicalMappingsForCourseraIds` + index lookups instead.
 */
export async function findCanonicalMappingForCourseraCourse(args: {
  courseraCourseId?: string | null;
  courseraCourseSlug?: string | null;
}): Promise<CanonicalMappingHit | null> {
  const courseId = args.courseraCourseId?.trim() || null;
  const courseSlug = args.courseraCourseSlug?.trim() || null;
  if (!courseId && !courseSlug) return null;

  const row = await prisma.courseraCanonicalCourseMapping.findFirst({
    where: {
      OR: [
        ...(courseId ? [{ courseraCourseId: courseId }] : []),
        ...(courseSlug ? [{ courseraCourseSlug: courseSlug }] : []),
      ],
    },
    select: {
      canonicalProgramSlug: true,
      canonicalCourseSlug: true,
    },
    // Most recently edited wins when (somehow) more than one row matches by
    // slug; courseraCourseId is unique so the courseId branch is always 0/1.
    orderBy: { updatedAt: 'desc' },
  });
  if (!row) return null;
  return {
    programSlug: row.canonicalProgramSlug,
    courseSlug: row.canonicalCourseSlug,
  };
}
