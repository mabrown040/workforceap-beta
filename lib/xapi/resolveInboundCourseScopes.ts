import { normalizeCourseraCourseId } from '@/lib/content/programCurriculumManifest';
import { canonicalizeProgramSlug } from '@/lib/content/programSlug';
import { resolveProviderCourseMappings } from '@/lib/coursera/curriculumMapping';
import {
  normalizeCurriculumVersion,
  type CurriculumAssignment,
  type CurriculumMappingResolution,
} from '@/lib/member/curriculumAssignment';

export type InboundCourseScope = {
  programSlug: string | null;
  curriculumVersion: string;
  assignmentMatched: boolean;
};

type ResolveMappings = (args: {
  courseraCourseId?: string | null;
  assignments: readonly CurriculumAssignment[];
}) => Promise<CurriculumMappingResolution>;

/**
 * Route one inbound provider fact to every exact learner assignment it
 * belongs to. A provider id is an exact-key contract: when assignments exist
 * but none intersect the mapping, do not fall back to the primary program's
 * slug/name heuristics. Providerless legacy statements retain that fallback.
 */
export async function resolveInboundCourseScopes(
  args: {
    courseraCourseId?: string | null;
    assignments: readonly CurriculumAssignment[];
    fallbackProgramSlug: string | null;
    fallbackCurriculumVersion: string | null | undefined;
  },
  resolveMappings: ResolveMappings = resolveProviderCourseMappings,
): Promise<InboundCourseScope[]> {
  const providerId = normalizeCourseraCourseId(args.courseraCourseId);
  if (!providerId) {
    return [{
      programSlug: args.fallbackProgramSlug
        ? canonicalizeProgramSlug(args.fallbackProgramSlug)
        : null,
      curriculumVersion: normalizeCurriculumVersion(args.fallbackCurriculumVersion),
      assignmentMatched: Boolean(args.fallbackProgramSlug),
    }];
  }

  if (args.assignments.length === 0) {
    // Preserve the detached exact-id path. The downstream canonical resolver
    // promotes only one unique legacy target; approved-v2 and ambiguous ids
    // remain raw-only.
    return [{
      programSlug: null,
      curriculumVersion: 'legacy-v1',
      assignmentMatched: false,
    }];
  }

  const resolution = await resolveMappings({
    courseraCourseId: providerId,
    assignments: args.assignments,
  });
  const deduped = new Map<string, InboundCourseScope>();
  for (const target of resolution.targets) {
    const programSlug = canonicalizeProgramSlug(target.programSlug);
    const curriculumVersion = normalizeCurriculumVersion(target.curriculumVersion);
    deduped.set(`${programSlug}|${curriculumVersion}`, {
      programSlug,
      curriculumVersion,
      assignmentMatched: true,
    });
  }
  return Array.from(deduped.values());
}
