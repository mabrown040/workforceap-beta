/**
 * Partner-school sponsorship rules (Phase B2).
 *
 * A sponsoring partner — typically a high school or an agency — covers the
 * cost of enrollment for members who sign up under its referral code or slug.
 * These helpers decide whether a sponsorship is currently in force and build
 * the provenance strings we stamp onto `CourseEnrollment`.
 *
 * Deliberately dependency-light: no Prisma client import, no `server-only`,
 * no I/O. Callers pass plain objects (a narrowed `partner.findFirst` select
 * is structurally compatible), which keeps this unit-testable under the
 * `node:test` runner and safe to import from edge/runtime-agnostic code.
 */

/**
 * Mirrors the `FundingSource` enum in schema.prisma. Declared locally rather
 * than imported from `@prisma/client` so this module stays independent of the
 * generated client; the two are structurally identical string unions, so
 * values flow both ways without a cast.
 */
export type SponsorshipFundingSource = 'GRANT' | 'EMPLOYER' | 'PARTNER_ORG' | 'SELF' | 'OTHER';

/** Default funding source when a sponsoring partner has not set one. */
export const DEFAULT_SPONSORSHIP_FUNDING_SOURCE: SponsorshipFundingSource = 'PARTNER_ORG';

/**
 * The subset of `Partner` these rules need. Every optional column is
 * nullable in the database, so accept `null | undefined` throughout.
 */
export type SponsorshipPartner = {
  id: string;
  name: string;
  sponsoredEnrollment: boolean;
  sponsorshipFundingSource?: SponsorshipFundingSource | null;
  sponsorshipTermLabel?: string | null;
  sponsorshipStartsAt?: Date | null;
  sponsorshipEndsAt?: Date | null;
  sponsorshipSeatCap?: number | null;
};

/**
 * True when the partner sponsors enrollment AND `now` falls inside the
 * sponsorship window. A null bound means "open ended" on that side, so a
 * partner with `sponsoredEnrollment` and no dates is always active.
 * Boundaries are inclusive: the start instant and the end instant both count.
 */
export function isSponsorshipActive(partner: SponsorshipPartner, now: Date): boolean {
  if (!partner.sponsoredEnrollment) return false;
  const startsAt = partner.sponsorshipStartsAt;
  if (startsAt && now.getTime() < startsAt.getTime()) return false;
  const endsAt = partner.sponsorshipEndsAt;
  if (endsAt && now.getTime() > endsAt.getTime()) return false;
  return true;
}

/**
 * Internal provenance written to `CourseEnrollment.fundingNotes` — this is
 * an admin-facing audit string, not member-facing copy.
 */
export function buildFundingNotes(partner: SponsorshipPartner): string {
  const term = partner.sponsorshipTermLabel?.trim();
  return `Sponsored by ${partner.name}${term ? ` (${term})` : ''}`;
}

/**
 * The ONE choke point for public-facing cost copy on sponsored enrollment.
 *
 * Every surface that tells a prospective student what a sponsored seat costs
 * must render this string rather than writing its own. Somebody paid for that
 * seat: copy implying otherwise misrepresents the partnership and reads to
 * students as "what's the catch?". Keep the phrasing "no cost to <school>
 * students … sponsored through our partnership". `sponsorship.test.ts` pins
 * the wording, including a regex barring the no-cost adjective this copy
 * deliberately avoids.
 */
export function buildSponsorshipMessage(partner: SponsorshipPartner): string {
  const term = partner.sponsorshipTermLabel?.trim();
  return (
    `There is no cost to ${partner.name} students${term ? ` for ${term}` : ''}` +
    ` — enrollment is sponsored through our partnership with ${partner.name}.`
  );
}

/**
 * Funding source to stamp on the enrollment. Partners that sponsor without
 * naming a source are recorded as PARTNER_ORG (the partner itself pays).
 */
export function resolveSponsorshipFundingSource(
  partner: SponsorshipPartner
): SponsorshipFundingSource {
  return partner.sponsorshipFundingSource ?? DEFAULT_SPONSORSHIP_FUNDING_SOURCE;
}

/**
 * True once the partner's funded seats are used up. A null cap means
 * uncapped, so this is never true for those partners.
 *
 * NOTE: this is a SOFT cap. Callers must not block a student on it — the
 * student still enrolls, we simply skip the funding stamp and flag the
 * application for admin review.
 */
export function isSeatCapReached(partner: SponsorshipPartner, usedSeats: number): boolean {
  const cap = partner.sponsorshipSeatCap;
  if (cap === null || cap === undefined) return false;
  return usedSeats >= cap;
}
