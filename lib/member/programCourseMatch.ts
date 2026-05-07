import 'server-only';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import type { Program } from '@/lib/content/programs';
import { COURSERA_TITLE_LOOSE_MIN_LEN, normalizeTitleForMatch } from '@/lib/member/courseraSkillsetMerge';

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Resolve a program course from any combination of identifiers we have for
 *  it. Order of preference:
 *    1. Coursera courseId (from context.extensions) — exact, stable, the only
 *       reliable join key for xAPI traffic.
 *    2. Slug match on the local catalog (for manual member-driven completion).
 *    3. Course display name (CSV import paths, partial xAPI events).
 *
 *  Lookup #1 needs the program slug too because the same Coursera course IDs
 *  are scoped to a specific Coursera Program; we resolve them through
 *  DISCOVERED_COURSERA_PROGRAMS, which lives next to the catalog of WAP
 *  programs. */
export function resolveProgramCourse(
  program: Program,
  args: {
    courseSlug?: string;
    courseName?: string;
    courseraCourseId?: string | null;
    enrolledProgramSlug?: string;
  }
): { slug: string; name: string } | null {
  if (args.courseraCourseId && args.enrolledProgramSlug) {
    const disc = DISCOVERED_COURSERA_PROGRAMS[args.enrolledProgramSlug];
    const needle = args.courseraCourseId.trim();
    const byCourseraId = disc?.courses.find((c) => c.courseId === needle);
    if (byCourseraId) {
      // Confirm the matched slug exists in the WAP program catalog before
      // returning — keeps the contract that a returned course is a real entry
      // in `program.courses` (consumers index into it for slug + name).
      const inProgram = program.courses.find((c) => c.slug === byCourseraId.slug);
      if (inProgram) return { slug: inProgram.slug, name: inProgram.name };
      // Fall back to the discovered metadata's name when the WAP catalog row
      // doesn't carry a separate display string.
      return { slug: byCourseraId.slug, name: byCourseraId.name };
    }
  }

  if (args.courseSlug) {
    const requestedSlug = args.courseSlug.trim();
    const requestedSlugNormalized = normalizeSlug(requestedSlug);
    const bySlug = program.courses.find((course) =>
      course.slug === requestedSlug
      || normalizeSlug(course.slug) === requestedSlugNormalized
      || normalizeSlug(course.name) === requestedSlugNormalized
    );
    if (bySlug) return { slug: bySlug.slug, name: bySlug.name };
  }

  if (args.courseName) {
    const target = normalizeText(args.courseName);
    const targetSlug = normalizeSlug(args.courseName);
    const byName = program.courses.find((course) =>
      normalizeText(course.name) === target || normalizeSlug(course.name) === targetSlug
    );
    if (byName) return { slug: byName.slug, name: byName.name };

    const looseTarget = normalizeTitleForMatch(args.courseName);
    if (looseTarget.length >= COURSERA_TITLE_LOOSE_MIN_LEN) {
      const loose = program.courses.find((course) => {
        const candidate = normalizeTitleForMatch(course.name);
        return (
          candidate.length >= COURSERA_TITLE_LOOSE_MIN_LEN &&
          (looseTarget.includes(candidate) || candidate.includes(looseTarget))
        );
      });
      if (loose) return { slug: loose.slug, name: loose.name };
    }
  }

  return null;
}

/**
 * Fallback resolver that also searches the Coursera discovered catalog.
 * Used by xAPI pipeline when the portal program course list doesn't match
 * Coursera's actual course names/slugs.
 */
export function resolveProgramCourseWithCatalogFallback(
  program: Program,
  args: {
    courseSlug?: string;
    courseName?: string;
    courseraCourseId?: string | null;
    enrolledProgramSlug?: string;
  }
): { slug: string; name: string } | null {
  // First try the portal program's course list (and courseId via discovered)
  const fromProgram = resolveProgramCourse(program, args);
  if (fromProgram) return fromProgram;

  // Fallback: search discovered catalog by program slug
  const discovered = DISCOVERED_COURSERA_PROGRAMS[program.slug];
  if (!discovered) return null;

  if (args.courseraCourseId) {
    const needle = args.courseraCourseId.trim();
    const byCourseraId = discovered.courses.find((course) => course.courseId === needle);
    if (byCourseraId) return { slug: byCourseraId.slug, name: byCourseraId.name };
  }

  if (args.courseSlug) {
    const requestedSlug = args.courseSlug.trim();
    const requestedSlugNormalized = normalizeSlug(requestedSlug);
    const bySlug = discovered.courses.find((course) =>
      course.slug === requestedSlug
      || normalizeSlug(course.slug) === requestedSlugNormalized
      || normalizeSlug(course.name) === requestedSlugNormalized
    );
    if (bySlug) return { slug: bySlug.slug, name: bySlug.name };
  }

  if (args.courseName) {
    const target = normalizeText(args.courseName);
    const targetSlug = normalizeSlug(args.courseName);
    const byName = discovered.courses.find((course) =>
      normalizeText(course.name) === target || normalizeSlug(course.name) === targetSlug
    );
    if (byName) return { slug: byName.slug, name: byName.name };

    const looseTarget = normalizeTitleForMatch(args.courseName);
    if (looseTarget.length >= COURSERA_TITLE_LOOSE_MIN_LEN) {
      const loose = discovered.courses.find((course) => {
        const candidate = normalizeTitleForMatch(course.name);
        return (
          candidate.length >= COURSERA_TITLE_LOOSE_MIN_LEN &&
          (looseTarget.includes(candidate) || candidate.includes(looseTarget))
        );
      });
      if (loose) return { slug: loose.slug, name: loose.name };
    }
  }

  return null;
}
