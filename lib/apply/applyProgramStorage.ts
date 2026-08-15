/** sessionStorage keys for apply funnel program selection */
export const APPLY_PROGRAM_SLUG_KEY = 'apply_program_slug';
/** JSON string: string[] — up to 3 program slugs in preference order */
export const APPLY_PROGRAM_RANKED_KEY = 'apply_program_ranked_slugs';

/** localStorage key — shared with Find Your Path (v1 payload with careerMatch). */
export const FYP_RESULTS_STORAGE_KEY = 'find_your_path_results';

/** localStorage: in-progress apply step 1 (contact + eligibility answers). */
export const APPLY_FLOW_DRAFT_KEY = 'apply_flow_draft_v1';

export type ApplyFlowDraftV1 = {
  version: 1;
  updatedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageGroup?: 'under_18' | '18_24' | '25_50' | '50_plus' | '';
  city?: string;
  state?: string;
  zip?: string;
  county?: string;
  /** @deprecated single-select legacy; kept for back-compat with old drafts */
  primaryBarrier?: string;
  primaryBarriers?: string[];
  q1: 'yes' | 'no' | null;
  q2: 'yes' | 'no' | null;
  /**
   * School-partner variant fields (Phase B4). Every one of these is OPTIONAL
   * and must stay that way: a draft written before B4 — or by the organic /
   * paid variants, which never render these inputs — has to keep
   * deserializing unchanged. `readDraft` in ApplyEligibilityClient parses the
   * stored JSON straight into this type, so a required field here would
   * silently mistype every pre-existing draft on disk.
   */
  /** '9' | '10' | '11' | '12' — matches components/forms/ParentalConsentForm. */
  gradeLevel?: string;
  /**
   * NO `schoolAttestation`, and no expected-graduation year.
   *
   * The attestation ("I am currently enrolled at <school>") is an AFFIRMATION:
   * it must be made in the session that submits it, so it is never written to
   * or restored from this draft. Restoring it meant the next student on a
   * shared machine could arrive at a pre-ticked statement about a school they
   * do not attend and submit it without ever reading it.
   *
   * The expected-graduation year had no column and no reader, and is derivable
   * from `gradeLevel`; the question was removed rather than kept as free text.
   *
   * Both are simply absent from drafts written by newer builds; older drafts
   * that still carry the keys deserialize fine and the extra keys are ignored.
   */
  studentId?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
};

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
