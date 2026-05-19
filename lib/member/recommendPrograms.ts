import { PROGRAMS, getProgramBySlug } from '@/lib/content/programs';
import type { CareerMatchResult } from '@/lib/onet/types';

/** Default program slugs when no personalized recommendation exists. */
export const DEFAULT_RECOMMENDED_PROGRAM_SLUGS = PROGRAMS.slice(0, 3).map((p) => p.slug);

export type RecommendedProgramSummary = {
  programSlug: string;
  title: string;
  whyRecommended?: string;
  recommendationType?: 'primary' | 'bridge' | 'stretch';
};

/**
 * Resolve up to `limit` program slugs from stored career match JSON,
 * falling back to the first three catalog programs.
 */
export function resolveRecommendedProgramSlugs(
  careerRecommendation: CareerMatchResult | null | undefined,
  limit = 3
): string[] {
  const fromMatch =
    careerRecommendation?.recommendedPrograms
      ?.map((r) => r.programSlug)
      .filter((slug) => Boolean(getProgramBySlug(slug))) ?? [];

  if (fromMatch.length > 0) {
    return [...new Set(fromMatch)].slice(0, limit);
  }

  return DEFAULT_RECOMMENDED_PROGRAM_SLUGS.slice(0, limit);
}

export function resolveRecommendedProgramSummaries(
  careerRecommendation: CareerMatchResult | null | undefined,
  limit = 3
): RecommendedProgramSummary[] {
  const slugs = resolveRecommendedProgramSlugs(careerRecommendation, limit);
  const matchBySlug = new Map(
    (careerRecommendation?.recommendedPrograms ?? []).map((r) => [r.programSlug, r])
  );

  return slugs.map((programSlug) => {
    const program = getProgramBySlug(programSlug);
    const match = matchBySlug.get(programSlug);
    return {
      programSlug,
      title: program?.title ?? programSlug,
      whyRecommended: match?.whyRecommended,
      recommendationType: match?.recommendationType,
    };
  });
}
