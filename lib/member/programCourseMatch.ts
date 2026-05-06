import 'server-only';

import { DISCOVERED_COURSERA_PROGRAMS } from '@/lib/content/courseraDiscoveredCatalog';
import type { Program } from '@/lib/content/programs';

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

/** Resolve a program course from slug and/or display name (shared by xAPI + manual completion). */
export function resolveProgramCourse(
  program: Program,
  args: { courseSlug?: string; courseName?: string }
): { slug: string; name: string } | null {
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
  args: { courseSlug?: string; courseName?: string }
): { slug: string; name: string } | null {
  // First try the portal program's course list
  const fromProgram = resolveProgramCourse(program, args);
  if (fromProgram) return fromProgram;

  // Fallback: search discovered catalog by program slug
  const discovered = DISCOVERED_COURSERA_PROGRAMS[program.slug];
  if (!discovered) return null;

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
  }

  return null;
}
