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
