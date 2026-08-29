import { Prisma } from '@prisma/client';

import {
  getProgramBySlug,
  PROGRAMS,
  SUPPORTED_PROGRAM_STORAGE_VALUES,
} from '@/lib/content/programs';

export type ValidatedProgramCompletionSpec = {
  canonicalSlug: string;
  totalCourses: number;
  storageValues: readonly string[];
};

/**
 * Reporting-safe program denominators.
 *
 * The catalog's operational course list is Y. A stored rollup is complete only
 * when its completed-course count is exactly Y; averagePercent is intentionally
 * absent because legacy/provider aggregates can report 100 before every WAP
 * syllabus course is complete.
 */
export const VALIDATED_PROGRAM_COMPLETION_SPECS: readonly ValidatedProgramCompletionSpec[] =
  PROGRAMS.filter((program) => program.courses.length > 0).map((program) => ({
    canonicalSlug: program.slug,
    totalCourses: program.courses.length,
    storageValues: Array.from(
      new Set(
        SUPPORTED_PROGRAM_STORAGE_VALUES.filter(
          (value) => getProgramBySlug(value)?.slug === program.slug,
        ),
      ),
    ),
  }));

const COMPLETION_SPEC_BY_STORAGE_VALUE = new Map(
  VALIDATED_PROGRAM_COMPLETION_SPECS.flatMap((spec) =>
    spec.storageValues.map((value) => [value, spec] as const),
  ),
);
const COMPLETION_SPEC_BY_CANONICAL_SLUG = new Map(
  VALIDATED_PROGRAM_COMPLETION_SPECS.map((spec) => [spec.canonicalSlug, spec] as const),
);

export function getValidatedProgramCompletionSpec(
  programValue: string | null | undefined,
): ValidatedProgramCompletionSpec | null {
  if (!programValue) return null;
  const trimmed = programValue.trim();
  const canonicalSlug = getProgramBySlug(trimmed)?.slug;
  return (
    COMPLETION_SPEC_BY_STORAGE_VALUE.get(programValue) ??
    COMPLETION_SPEC_BY_STORAGE_VALUE.get(trimmed) ??
    (canonicalSlug ? COMPLETION_SPEC_BY_CANONICAL_SLUG.get(canonicalSlug) : undefined) ??
    null
  );
}

export function isValidatedProgramComplete(
  programValue: string | null | undefined,
  coursesCompleted: number | null | undefined,
): boolean {
  const spec = getValidatedProgramCompletionSpec(programValue);
  return Boolean(
    spec &&
      Number.isInteger(coursesCompleted) &&
      coursesCompleted === spec.totalCourses,
  );
}

export function hasValidatedProgramCompletion(
  enrolledProgram: string | null | undefined,
  progressRows: ReadonlyArray<{ programSlug: string; coursesCompleted: number }>,
): boolean {
  const enrolledSpec = getValidatedProgramCompletionSpec(enrolledProgram);
  if (!enrolledSpec) return false;
  return progressRows.some((row) => {
    const progressSpec = getValidatedProgramCompletionSpec(row.programSlug);
    return (
      progressSpec?.canonicalSlug === enrolledSpec.canonicalSlug &&
      row.coursesCompleted === enrolledSpec.totalCourses
    );
  });
}

/**
 * Parameterized VALUES rows for aggregate SQL consumers:
 *   (canonical_slug, storage_value, total_courses)
 *
 * Callers wrap this fragment in their own CTE so tenant/date/member filters
 * remain local and visible at each reporting boundary.
 */
export function validatedProgramCompletionValuesSql(): Prisma.Sql {
  return Prisma.join(
    VALIDATED_PROGRAM_COMPLETION_SPECS.flatMap((spec) =>
      spec.storageValues.map((storageValue) =>
        Prisma.sql`(${spec.canonicalSlug}, ${storageValue}, ${spec.totalCourses})`,
      ),
    ),
  );
}
