import type { Program } from '@/lib/content/programs';

/** Slugs completed that belong to this program's catalog (order-independent). */
export function countCompletedInProgram(program: Program, completedSlugs: string[]): number {
  const set = new Set(completedSlugs);
  return program.courses.filter((course) => set.has(course.slug)).length;
}

/**
 * First incomplete course in catalog order (stable launch / “current course”).
 * Out-of-order completions still leave “current” at the earliest gap.
 */
export function getFirstIncompleteCourseIndex(program: Program, completedSlugs: string[]): number | undefined {
  const set = new Set(completedSlugs);
  const idx = program.courses.findIndex((course) => !set.has(course.slug));
  return idx === -1 ? undefined : idx;
}
