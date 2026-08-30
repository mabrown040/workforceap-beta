import { Prisma } from '@prisma/client';

import {
  getProgramBySlug,
  PROGRAMS,
  SUPPORTED_PROGRAM_STORAGE_VALUES,
} from '@/lib/content/programs';
import {
  APPROVED_PROGRAM_CURRICULA,
  CATALOG_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
} from '@/lib/content/programCurriculumManifest';

export type ValidatedProgramCompletionSpec = {
  canonicalSlug: string;
  curriculumVersion: string;
  totalCourses: number;
  storageValues: readonly string[];
};

/**
 * Reporting-safe program denominators.
 *
 * A learner's immutable CourseEnrollment curriculum version selects Y. A stored
 * rollup is complete only when its completed-course count is exactly Y;
 * averagePercent is intentionally absent because legacy/provider aggregates can
 * report 100 before every WAP syllabus course is complete.
 */
function storageValuesForProgram(canonicalSlug: string): string[] {
  return Array.from(
    new Set(
      SUPPORTED_PROGRAM_STORAGE_VALUES.filter(
        (value) => getProgramBySlug(value)?.slug === canonicalSlug,
      ),
    ),
  );
}

const LEGACY_PROGRAM_COMPLETION_SPECS: readonly ValidatedProgramCompletionSpec[] =
  PROGRAMS.filter((program) => program.courses.length > 0).map((program) => ({
    canonicalSlug: program.slug,
    curriculumVersion: LEGACY_CURRICULUM_VERSION,
    totalCourses: program.courses.length,
    storageValues: storageValuesForProgram(program.slug),
  }));

const APPROVED_PROGRAM_COMPLETION_SPECS: readonly ValidatedProgramCompletionSpec[] =
  APPROVED_PROGRAM_CURRICULA.map((manifest) => ({
    canonicalSlug: manifest.programSlug,
    curriculumVersion: manifest.version,
    totalCourses: manifest.expectedCourseCount,
    storageValues: storageValuesForProgram(manifest.programSlug),
  }));

const CATALOG_PROGRAM_COMPLETION_SPECS: readonly ValidatedProgramCompletionSpec[] =
  PROGRAMS.filter((program) => program.courses.length > 0).map((program) => ({
    canonicalSlug: program.slug,
    curriculumVersion: CATALOG_CURRICULUM_VERSION,
    totalCourses: program.courses.length,
    storageValues: storageValuesForProgram(program.slug),
  }));

export const VALIDATED_PROGRAM_COMPLETION_SPECS: readonly ValidatedProgramCompletionSpec[] = [
  ...LEGACY_PROGRAM_COMPLETION_SPECS,
  ...CATALOG_PROGRAM_COMPLETION_SPECS,
  ...APPROVED_PROGRAM_COMPLETION_SPECS,
];

const COMPLETION_SPEC_BY_STORAGE_VALUE = new Map(
  VALIDATED_PROGRAM_COMPLETION_SPECS.flatMap((spec) =>
    spec.storageValues.map(
      (value) => [`${value}\0${spec.curriculumVersion}`, spec] as const,
    ),
  ),
);
const COMPLETION_SPEC_BY_CANONICAL_SLUG = new Map(
  VALIDATED_PROGRAM_COMPLETION_SPECS.map(
    (spec) => [`${spec.canonicalSlug}\0${spec.curriculumVersion}`, spec] as const,
  ),
);

export function getValidatedProgramCompletionSpec(
  programValue: string | null | undefined,
  curriculumVersion: string | null | undefined,
): ValidatedProgramCompletionSpec | null {
  if (!programValue || !curriculumVersion) return null;
  const trimmed = programValue.trim();
  const version = curriculumVersion.trim();
  if (!trimmed || !version) return null;
  const canonicalSlug = getProgramBySlug(trimmed)?.slug;
  return (
    COMPLETION_SPEC_BY_STORAGE_VALUE.get(`${programValue}\0${version}`) ??
    COMPLETION_SPEC_BY_STORAGE_VALUE.get(`${trimmed}\0${version}`) ??
    (canonicalSlug
      ? COMPLETION_SPEC_BY_CANONICAL_SLUG.get(`${canonicalSlug}\0${version}`)
      : undefined) ??
    null
  );
}

export function isValidatedProgramComplete(
  programValue: string | null | undefined,
  curriculumVersion: string | null | undefined,
  coursesCompleted: number | null | undefined,
): boolean {
  const spec = getValidatedProgramCompletionSpec(programValue, curriculumVersion);
  return Boolean(
    spec &&
      Number.isInteger(coursesCompleted) &&
      coursesCompleted === spec.totalCourses,
  );
}

export function hasValidatedProgramCompletion(
  enrolledProgram: string | null | undefined,
  curriculumVersion: string | null | undefined,
  progressRows: ReadonlyArray<{ programSlug: string; coursesCompleted: number }>,
): boolean {
  const enrolledSpec = getValidatedProgramCompletionSpec(enrolledProgram, curriculumVersion);
  if (!enrolledSpec) return false;
  return progressRows.some((row) => {
    const progressSpec = getValidatedProgramCompletionSpec(
      row.programSlug,
      curriculumVersion,
    );
    return (
      progressSpec?.canonicalSlug === enrolledSpec.canonicalSlug &&
      row.coursesCompleted === enrolledSpec.totalCourses
    );
  });
}

/**
 * Parameterized VALUES rows for aggregate SQL consumers:
 *   (canonical_slug, storage_value, curriculum_version, total_courses)
 *
 * Callers wrap this fragment in their own CTE so tenant/date/member filters
 * remain local and visible at each reporting boundary. Every caller must join
 * curriculum_version from CourseEnrollment; no reporting path may infer it.
 */
export function validatedProgramCompletionValuesSql(): Prisma.Sql {
  return Prisma.join(
    VALIDATED_PROGRAM_COMPLETION_SPECS.flatMap((spec) =>
      spec.storageValues.map((storageValue) =>
        Prisma.sql`(${spec.canonicalSlug}, ${storageValue}, ${spec.curriculumVersion}, ${spec.totalCourses})`,
      ),
    ),
  );
}

/**
 * Version-explicit assignment rows for reporting SQL.
 *
 * CourseEnrollment is authoritative whenever one exists. Older members whose
 * enrollment predates that table retain their User.enrolledProgram as an
 * explicit legacy-v1 compatibility assignment; they can never be inferred into
 * an approved curriculum.
 */
export function validatedProgramAssignmentRowsSql(): Prisma.Sql {
  return Prisma.sql`
    SELECT ce.user_id, ce.program_slug, ce.curriculum_version
    FROM course_enrollments ce
    UNION ALL
    SELECT u.id, u.enrolled_program, ${LEGACY_CURRICULUM_VERSION}
    FROM users u
    WHERE u.enrolled_program IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM course_enrollments ce
        WHERE ce.user_id = u.id
      )
  `;
}
