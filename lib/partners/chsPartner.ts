/**
 * Concordia High School (CHS) launch constants.
 *
 * Single source of truth shared by the provisioning scripts
 * (`scripts/create-chs-partner.ts`, `scripts/stamp-chs-funding.ts`,
 * `scripts/seed-partner-school.ts`) and by the tests that assert the student
 * link resolves to the partner row.
 *
 * CONVENTION: the `/enroll/<segment>` URL segment IS the partner slug. The
 * middleware derives the partner ref straight from that segment and
 * `/api/apply/signup` resolves it against `Partner.slug` (or
 * `Partner.referralCode`), so the printed student link and the database row
 * cannot be allowed to drift. `chsPartner.test.ts` pins that equality.
 *
 * Deliberately dependency-light (no Prisma, no `server-only`) so scripts,
 * edge middleware, and the node:test runner can all import it.
 */

/** Partner slug. Must equal the `/enroll/<segment>` in the student link. */
export const CHS_PARTNER_SLUG = 'concordia';

/** Student-facing enrollment path printed in the school email + runbook. */
export const CHS_ENROLL_PATH = `/enroll/${CHS_PARTNER_SLUG}`;

/**
 * Referral code. Kept distinct from the slug so the pre-existing
 * `/apply?ref=chs2026` links that already went out keep working.
 */
export const CHS_PARTNER_REFERRAL_CODE = 'chs2026';

/** Partner display name. */
export const CHS_PARTNER_NAME = 'Concordia High School';

/** Sponsorship term label written to `Partner.sponsorshipTermLabel`. */
export const CHS_SPONSORSHIP_TERM_LABEL = '2026';

/** Inclusive sponsorship window start (UTC). */
export const CHS_SPONSORSHIP_STARTS_AT = new Date('2026-01-01T00:00:00Z');

/** Inclusive sponsorship window end (UTC). */
export const CHS_SPONSORSHIP_ENDS_AT = new Date('2026-12-31T23:59:59Z');

/**
 * True when a partner slug or referral code identifies Concordia High School.
 * Used by ops campaigns that must exclude CHS members (WS5 soft reminder blast).
 */
export function isChsPartnerRef(slugOrCode: string | null | undefined): boolean {
  if (!slugOrCode) return false;
  const v = slugOrCode.trim().toLowerCase();
  return v === CHS_PARTNER_SLUG || v === CHS_PARTNER_REFERRAL_CODE.toLowerCase();
}

/**
 * Prisma `UserWhereInput` fragment: members who are NOT referred by the CHS partner.
 * Match on Partner.slug OR Partner.referralCode so either identifier excludes them.
 */
export function excludeChsPartnerReferralsWhere(): {
  partnerReferrals: {
    none: {
      partner: {
        OR: Array<{ slug: string } | { referralCode: string }>;
      };
    };
  };
} {
  return {
    partnerReferrals: {
      none: {
        partner: {
          OR: [{ slug: CHS_PARTNER_SLUG }, { referralCode: CHS_PARTNER_REFERRAL_CODE }],
        },
      },
    },
  };
}
