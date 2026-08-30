import type { Program, ProgramCourse } from '@/lib/content/programs';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import {
  APPROVED_CURRICULUM_VERSION,
  CATALOG_CURRICULUM_VERSION,
  LEGACY_CURRICULUM_VERSION,
  getProgramCurriculumManifest,
  isApprovedCurriculumReadyForAssignment,
  isApprovedCurriculumReadyForCanary,
  normalizeCourseraCourseId,
  type CurriculumVersion,
} from '@/lib/content/programCurriculumManifest';

export type CurriculumAssignment = {
  programSlug: string;
  curriculumVersion: string;
  isPrimary?: boolean;
};

export type CurriculumMappingTarget = {
  programSlug: string;
  curriculumVersion: string;
  courseSlug: string;
  courseraCourseId: string;
};

export type CurriculumMappingResolution = {
  targets: CurriculumMappingTarget[];
  status: 'matched_assignment' | 'unique_unassigned' | 'ambiguous' | 'unmapped';
};

/**
 * New assignments remain on the frozen operational curriculum until the
 * exact external Coursera learning path has been validated. Existing rows are
 * never upgraded by this helper.
 */
export function activeCurriculumVersion(
  programSlug: string,
  options: { explicitCanary?: boolean } = {},
): CurriculumVersion {
  const canonicalProgramSlug = canonicalizeProgramSlug(programSlug);
  const approvedReady = options.explicitCanary
    ? isApprovedCurriculumReadyForCanary(canonicalProgramSlug)
    : isApprovedCurriculumReadyForAssignment(canonicalProgramSlug);
  return approvedReady
    ? APPROVED_CURRICULUM_VERSION
    : LEGACY_CURRICULUM_VERSION;
}

export function normalizeCurriculumVersion(
  version: string | null | undefined,
): CurriculumVersion {
  const normalized = version?.trim() ?? '';
  if (!normalized || normalized === LEGACY_CURRICULUM_VERSION) {
    return LEGACY_CURRICULUM_VERSION;
  }
  if (normalized === APPROVED_CURRICULUM_VERSION) return APPROVED_CURRICULUM_VERSION;
  if (normalized === CATALOG_CURRICULUM_VERSION) return CATALOG_CURRICULUM_VERSION;
  throw new Error(`Unknown curriculum version: ${normalized}`);
}

/**
 * Resolve the ordered denominator for a learner's immutable assignment.
 * Public catalog callers can continue using Program.courses; learner-scoped
 * readers must pass the stored version through this function.
 */
export function getProgramCoursesForCurriculumVersion(
  program: Program,
  curriculumVersion: string | null | undefined,
): ProgramCourse[] {
  const version = normalizeCurriculumVersion(curriculumVersion);
  const approved = getProgramCurriculumManifest(program.slug, version);
  if (approved) return approved.courses.map((course) => ({ ...course }));

  return program.courses.map((course) => ({ ...course }));
}

/**
 * Intersect provider mapping candidates with immutable learner assignments.
 * A shared provider course fans out only when the learner is actually assigned
 * to each matching curriculum. With no assignment, a single distinct target
 * may be retained as raw-linked progress; ambiguity stays raw-only.
 */
export function selectCurriculumMappingTargets(args: {
  candidates: readonly CurriculumMappingTarget[];
  assignments: readonly CurriculumAssignment[];
}): CurriculumMappingResolution {
  const candidates = dedupeTargets(args.candidates);
  if (candidates.length === 0) return { targets: [], status: 'unmapped' };

  if (args.assignments.length > 0) {
    const assignmentKeys = new Set(
      args.assignments.map(
        (assignment) =>
          `${canonicalizeProgramSlug(assignment.programSlug)}|${normalizeCurriculumVersion(
            assignment.curriculumVersion,
          )}`,
      ),
    );
    const matched = candidates.filter((candidate) =>
      assignmentKeys.has(
        `${canonicalizeProgramSlug(candidate.programSlug)}|${normalizeCurriculumVersion(
          candidate.curriculumVersion,
        )}`,
      ),
    );
    return matched.length > 0
      ? { targets: matched, status: 'matched_assignment' }
      : { targets: [], status: 'unmapped' };
  }

  const byCanonicalPair = new Map<string, CurriculumMappingTarget>();
  for (const candidate of candidates) {
    const key = `${canonicalizeProgramSlug(candidate.programSlug)}|${candidate.courseSlug}`;
    if (!byCanonicalPair.has(key)) byCanonicalPair.set(key, candidate);
  }
  if (byCanonicalPair.size === 1) {
    return { targets: [Array.from(byCanonicalPair.values())[0]!], status: 'unique_unassigned' };
  }
  return { targets: [], status: 'ambiguous' };
}

function dedupeTargets(
  targets: readonly CurriculumMappingTarget[],
): CurriculumMappingTarget[] {
  const deduped = new Map<string, CurriculumMappingTarget>();
  for (const target of targets) {
    const normalized: CurriculumMappingTarget = {
      ...target,
      programSlug: canonicalizeProgramSlug(target.programSlug),
      curriculumVersion: normalizeCurriculumVersion(target.curriculumVersion),
      courseraCourseId: normalizeCourseraCourseId(target.courseraCourseId),
    };
    if (!normalized.courseraCourseId) continue;
    deduped.set(
      `${normalized.programSlug}|${normalized.curriculumVersion}|${normalized.courseSlug}`,
      normalized,
    );
  }
  return Array.from(deduped.values());
}
