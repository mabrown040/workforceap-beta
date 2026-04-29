export type WioaGateResult =
  | { ok: true }
  | { ok: false; code: 'WIOA_NOT_STARTED' | 'WIOA_PENDING' | 'WIOA_NOT_ELIGIBLE' };

/** Gate check for Coursera enrollment: member must have counselor-verified WIOA status. */
export function isMemberWioaVerified(input: {
  wioaReviewStatus: string | null | undefined;
  enrolledByAdminId?: string | null;
}): WioaGateResult {
  if (input.enrolledByAdminId) return { ok: true };

  const status = input.wioaReviewStatus ?? null;
  if (status === 'verified') return { ok: true };
  if (status === 'pending') return { ok: false, code: 'WIOA_PENDING' };
  if (status === 'not_eligible' || status === 'needs_info') return { ok: false, code: 'WIOA_NOT_ELIGIBLE' };
  return { ok: false, code: 'WIOA_NOT_STARTED' };
}
