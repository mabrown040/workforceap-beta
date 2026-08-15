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
 * The term a sponsorship message should name. Prefers the partner's explicit
 * label; falls back to the end year so a partner with a window but no label
 * still gets bounded copy rather than an open-ended promise. Null only when
 * the partner has neither, i.e. the sponsorship really is open-ended.
 */
function sponsorshipTermClause(partner: SponsorshipPartner): string | null {
  const label = partner.sponsorshipTermLabel?.trim();
  if (label) return label;
  const endsAt = partner.sponsorshipEndsAt;
  if (endsAt) return String(endsAt.getUTCFullYear());
  return null;
}

/**
 * Public-facing cost copy for sponsored enrollment.
 *
 * THE choke point for public cost copy. As of Phase B3 this is the only place
 * that sentence is written: the dynamic `/enroll/[partnerSlug]` page renders
 * this string (hero, program band, FAQ, closing CTA, and the page description)
 * and the static `marketing/src/pages/enroll/concordia.astro` that used to
 * hardcode its own `COST_SENTENCE` was deleted with it. Any new surface must
 * call this rather than restate it — `tests/api/concordia-enroll-page.spec.ts`
 * asserts the enrollment page carries no cost sentence of its own.
 *
 * Somebody paid for that seat: copy implying otherwise misrepresents the
 * partnership and reads to students as "what's the catch?". `sponsorship.test.ts`
 * pins the wording, including a regex barring the no-cost adjective this copy
 * deliberately avoids.
 *
 * Two properties the wording must keep:
 *
 *  - NAME BOTH PARTIES. "sponsored through our partnership with <school>"
 *    reads circular on the school's own enrollment page, where "our" has no
 *    referent — the reader is already on a page branded for that school. Say
 *    "the WorkforceAP–<school> partnership" (en dash, matching the original
 *    static Concordia page) so a student and a parent can both tell who is
 *    paying.
 *  - SCOPE THE CLAIM. An unqualified "there is no cost to X students" is a
 *    promise about everything the student might buy from us. The sponsorship
 *    covers enrollment in the certificate programs on the page and nothing
 *    else, so the sentence says exactly that, bounded by the term whenever the
 *    sponsorship is bounded.
 */
export function buildSponsorshipMessage(partner: SponsorshipPartner): string {
  const term = sponsorshipTermClause(partner);
  return (
    `There is no cost to ${partner.name} students${term ? ` for ${term}` : ''}` +
    ` to enroll in these certificate programs` +
    ` — enrollment is sponsored through the WorkforceAP–${partner.name} partnership.`
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

/** Shape of the `CourseEnrollment.count` filter built by `buildSponsoredSeatWhere`. */
export type SponsoredSeatWhere = {
  sponsoredByPartnerId: string;
  enrolledAt?: { gte?: Date; lte?: Date };
};

/**
 * Filter for counting the seats a partner has already consumed THIS TERM.
 *
 * The seat cap is per sponsorship window, not lifetime: nothing ever clears
 * `sponsoredByPartnerId`, so an unscoped count would still read last term's
 * total after a rollover and silently leave every new student unfunded. Scope
 * the count to the same window `isSponsorshipActive` gates on — a partner
 * with no window configured is genuinely uncapped in time and counts all of
 * its sponsored enrollments.
 *
 * Boundaries are inclusive to match `isSponsorshipActive`, so an enrollment
 * created at the exact start or end instant is inside the term it funded.
 */
export function buildSponsoredSeatWhere(partner: SponsorshipPartner): SponsoredSeatWhere {
  const enrolledAt: { gte?: Date; lte?: Date } = {};
  if (partner.sponsorshipStartsAt) enrolledAt.gte = partner.sponsorshipStartsAt;
  if (partner.sponsorshipEndsAt) enrolledAt.lte = partner.sponsorshipEndsAt;
  return {
    sponsoredByPartnerId: partner.id,
    ...(enrolledAt.gte || enrolledAt.lte ? { enrolledAt } : {}),
  };
}
