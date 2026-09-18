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
import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';

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
/**
 * Every spelling under which a normalized Coursera course id may be stored.
 *
 * B4B's `listContents` returns `Course~<id>`; its `enrollmentReports` return
 * the bare `<id>`. Mapping rows were seeded from whichever endpoint fed them,
 * progress rows always carry the bare form, and `courseraCourseId` is unique
 * per spelling — so the same course can hold a bare row and a prefixed twin,
 * and an exact-match lookup on the bare id sees only one of them. Measured in
 * production: 130 of 228 mapping rows carried the prefix, and 20 of 42 raw
 * progress rows matched no mapping at all because of it.
 */
export function courseraCourseIdLookupVariants(normalizedId: string): string[] {
  return [normalizedId, `Course~${normalizedId}`, `Specialization~${normalizedId}`];
}

type CanonicalMappingRowLike = {
  courseraCourseId: string;
  courseraCourseSlug: string | null;
  canonicalProgramSlug: string;
  canonicalCourseSlug: string;
};

/**
 * Build the index keyed by NORMALIZED Coursera course id.
 *
 * When a bare row and a `Course~` twin both exist for one course, the bare row
 * wins. Progress rows carry bare ids, so the bare row is the only one that has
 * ever matched — preferring it preserves today's behaviour exactly, and lets
 * prefixed rows fill gaps rather than override curated ones. The same rule
 * applies to the slug index.
 */
export function indexCanonicalMappingRows(
  rows: readonly CanonicalMappingRowLike[],
): CanonicalMappingIndex {
  const index = emptyCanonicalMappingIndex();
  const idKeyIsBare = new Map<string, boolean>();
  const slugKeyIsBare = new Map<string, boolean>();

  for (const row of rows) {
    const stored = row.courseraCourseId.trim();
    const key = normalizeCourseraCourseId(stored);
    if (!key) continue;
    const bare = stored === key;
    const hit: CanonicalMappingHit = {
      programSlug: row.canonicalProgramSlug,
      courseSlug: row.canonicalCourseSlug,
    };

    const idSeen = idKeyIsBare.get(key);
    if (idSeen === undefined || (bare && idSeen === false)) {
      index.byCourseraCourseId.set(key, hit);
      idKeyIsBare.set(key, bare);
    }

    const slug = row.courseraCourseSlug?.trim();
    if (slug) {
      const slugSeen = slugKeyIsBare.get(slug);
      if (slugSeen === undefined || (bare && slugSeen === false)) {
        index.byCourseraCourseSlug.set(slug, hit);
        slugKeyIsBare.set(slug, bare);
      }
    }
  }
  return index;
}

export async function loadCanonicalMappingsForCourseraIds(
  ids: ReadonlyArray<string | null | undefined>,
): Promise<CanonicalMappingIndex> {
  const normalized = Array.from(
    new Set(
      ids
        .map((value) => (typeof value === 'string' ? normalizeCourseraCourseId(value) : ''))
        .filter((value): value is string => value.length > 0),
    ),
  );
  if (normalized.length === 0) return emptyCanonicalMappingIndex();

  const rows = await prisma.courseraCanonicalCourseMapping.findMany({
    take: LOOKUP_CATALOG_CAP,
    where: { courseraCourseId: { in: normalized.flatMap(courseraCourseIdLookupVariants) } },
    select: {
      courseraCourseId: true,
      courseraCourseSlug: true,
      canonicalProgramSlug: true,
      canonicalCourseSlug: true,
    },
  });

  return indexCanonicalMappingRows(rows);
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
  const courseId = normalizeCourseraCourseId(args.courseraCourseId) || null;
  const courseSlug = args.courseraCourseSlug?.trim() || null;
  if (!courseId && !courseSlug) return null;

  const rows = await prisma.courseraCanonicalCourseMapping.findMany({
    where: {
      OR: [
        ...(courseId
          ? [{ courseraCourseId: { in: courseraCourseIdLookupVariants(courseId) } }]
          : []),
        ...(courseSlug ? [{ courseraCourseSlug: courseSlug }] : []),
      ],
    },
    select: {
      courseraCourseId: true,
      canonicalProgramSlug: true,
      canonicalCourseSlug: true,
    },
    orderBy: { updatedAt: 'desc' },
    // At most three id spellings plus the odd slug collision.
    take: 16,
  });
  if (rows.length === 0) return null;

  // An id match outranks a slug match, and among id matches the bare row
  // outranks a prefixed twin. "Most recently updated" is deliberately NOT the
  // tie-break across spellings: two crons re-seed the prefixed rows every run,
  // so recency would let an auto-seeded twin outrank an admin-curated row.
  const idMatches = courseId
    ? rows.filter((row) => normalizeCourseraCourseId(row.courseraCourseId) === courseId)
    : [];
  const chosen =
    idMatches.find((row) => row.courseraCourseId.trim() === courseId) ??
    idMatches[0] ??
    rows[0];
  return {
    programSlug: chosen.canonicalProgramSlug,
    courseSlug: chosen.canonicalCourseSlug,
  };
}
