/** Staff workflow for WIOA self-screening — not a legal eligibility determination. */
export const WIOA_REVIEW_STATUSES = [
  'pending',
  'in_review',
  'verified',
  'not_eligible',
  'needs_info',
] as const;

export type WioaReviewStatus = (typeof WIOA_REVIEW_STATUSES)[number];

export const WIOA_REVIEW_LABELS: Record<WioaReviewStatus, string> = {
  pending: 'Pending review',
  in_review: 'In review',
  verified: 'Verified (staff)',
  not_eligible: 'Not eligible (staff)',
  needs_info: 'Needs more information',
};

export function wioaReviewLabel(s: string | null | undefined): string {
  if (!s) return '—';
  return WIOA_REVIEW_LABELS[s as WioaReviewStatus] ?? s;
}

/**
 * Statuses a counselor may record from the counselor student page.
 * `not_eligible` is deliberately excluded: the legal WIOA eligibility
 * determination belongs to the workforce board. Counselors record whether
 * intake is verified / complete, never eligibility.
 */
export const COUNSELOR_WIOA_REVIEW_STATUSES = [
  'pending',
  'in_review',
  'needs_info',
  'verified',
] as const satisfies readonly WioaReviewStatus[];

export type CounselorWioaReviewStatus = (typeof COUNSELOR_WIOA_REVIEW_STATUSES)[number];

/** Counselor-facing wording: "intake verified", never "eligible". */
export const COUNSELOR_WIOA_INTAKE_LABELS: Record<CounselorWioaReviewStatus, string> = {
  pending: 'Intake not yet verified',
  in_review: 'Intake in review',
  needs_info: 'Needs more information',
  verified: 'Intake verified',
};

export function isCounselorWioaReviewStatus(status: string): status is CounselorWioaReviewStatus {
  return (COUNSELOR_WIOA_REVIEW_STATUSES as readonly string[]).includes(status);
}
