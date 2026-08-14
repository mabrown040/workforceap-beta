/**
 * Partner taxonomy used to gate payout-related surface area.
 *
 * Two values today; the system is designed to expand to additional categories
 * (training_center, public_agency, funder) without a schema change since the
 * column is a free-form text field. New values that should be treated as
 * "may receive payouts" need to be added to PAYOUT_ELIGIBLE_TYPES.
 */

export const PARTNER_TYPES = ['community', 'referral', 'high_school'] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const DEFAULT_PARTNER_TYPE: PartnerType = 'community';

/**
 * Partner types whose members may see payout-related UI, connect Stripe Connect,
 * and trigger placement payouts.
 *
 * Keep this list narrow on purpose: an admin must explicitly upgrade a partner
 * record to one of these types before any payout-related code path activates.
 * Defaulting a new value to community-eligibility is the safer failure mode.
 */
export const PAYOUT_ELIGIBLE_TYPES = new Set<PartnerType>(['referral']);

export function isKnownPartnerType(value: unknown): value is PartnerType {
  return typeof value === 'string' && (PARTNER_TYPES as readonly string[]).includes(value);
}

/**
 * Coerce a partner row's stored type to a known value, falling back to
 * 'community' so legacy / malformed rows can never be treated as
 * payout-eligible.
 */
export function normalizePartnerType(value: unknown): PartnerType {
  return isKnownPartnerType(value) ? value : DEFAULT_PARTNER_TYPE;
}

export function isReferralPartner(partner: { partnerType?: string | null } | null | undefined): boolean {
  if (!partner) return false;
  return PAYOUT_ELIGIBLE_TYPES.has(normalizePartnerType(partner.partnerType));
}

export function isPayoutEligibleType(type: unknown): boolean {
  return PAYOUT_ELIGIBLE_TYPES.has(normalizePartnerType(type));
}
