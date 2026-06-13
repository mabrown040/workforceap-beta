/**
 * Pure referral rules — no DB, no `server-only` imports, safe to unit-test and to
 * import from client code. The DB-backed flow lives in lib/member/referrals.ts.
 */
export const MEMBER_REFERRAL_COOKIE = 'wap_mref';

/** No ambiguous characters (0/O, 1/I/L) so codes survive being read aloud / handwritten. */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 8;

export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{4,16}$/;

export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw ?? '').trim().toUpperCase().slice(0, 16);
}

export function isValidReferralCode(raw: string | null | undefined): boolean {
  return REFERRAL_CODE_PATTERN.test(normalizeReferralCode(raw));
}

/** Pure eligibility check for a referral reward. */
export type ReferralGuardInput = {
  referrerUserId: string | null;
  refereeUserId: string;
  alreadyReferred: boolean;
};
export function referralRewardEligibility(
  input: ReferralGuardInput
): { ok: boolean; reason: 'eligible' | 'unknown_code' | 'self_referral' | 'already_referred' } {
  if (!input.referrerUserId) return { ok: false, reason: 'unknown_code' };
  if (input.referrerUserId === input.refereeUserId) return { ok: false, reason: 'self_referral' };
  if (input.alreadyReferred) return { ok: false, reason: 'already_referred' };
  return { ok: true, reason: 'eligible' };
}
