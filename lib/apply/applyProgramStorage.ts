/** sessionStorage keys for apply funnel program selection */
export const APPLY_PROGRAM_SLUG_KEY = 'apply_program_slug';
/** JSON string: string[] — up to 3 program slugs in preference order */
export const APPLY_PROGRAM_RANKED_KEY = 'apply_program_ranked_slugs';

/** localStorage key — shared with Find Your Path (v1 payload with careerMatch). */
export const FYP_RESULTS_STORAGE_KEY = 'find_your_path_results';

export type CareerQuizSignupPayload = {
  recommendedOnetCode?: string;
  recommendedCareerTitle?: string;
  careerRecommendationJson?: object;
  needsComputerSupportFollowUp?: boolean;
};

/** Read O*NET career context saved by the Find Your Path quiz (browser only). */
export function getCareerQuizPayloadFromStorage(): CareerQuizSignupPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FYP_RESULTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version?: number;
      careerMatch?: {
        topOccupations?: { onetCode?: string; title?: string }[];
        supportFlags?: { needsComputerSupport?: boolean };
      };
    };
    if (parsed?.version !== 1 || !parsed.careerMatch) return null;
    const top = parsed.careerMatch.topOccupations?.[0];
    const code = top?.onetCode;
    const synthetic = code?.startsWith('local:');
    return {
      recommendedOnetCode: !synthetic && code ? code : undefined,
      recommendedCareerTitle: top?.title,
      careerRecommendationJson: parsed.careerMatch as object,
      needsComputerSupportFollowUp: parsed.careerMatch.supportFlags?.needsComputerSupport === true,
    };
  } catch {
    return null;
  }
}
