/**
 * School-partner resolution for `/apply` (Phase B4).
 *
 * An applicant who arrives through a high-school partner gets school-shaped
 * questions instead of the adult workforce-funding screener. THE PARTNER ROW
 * IS THE ONLY AUTHORITY for that switch: a `?src=`/`?school=` style query
 * param is attacker-controlled and would let anyone skip the WIOA screening
 * questions that fund an adult seat. The ref is only a lookup key — the
 * `partnerType` that comes back from the database decides the variant.
 *
 * It also resolves whether the partner's SPONSORSHIP is currently in force,
 * which is a separate question from `partnerType` and gates every sentence on
 * the page that makes a cost claim. See `resolveSponsorshipInForce`.
 *
 * Deliberately contains no React and no `next/*` import (same reasoning as
 * `lib/partners/enrollmentPage.ts`) so it is directly unit-testable, with the
 * Prisma client injectable through `deps.db`.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/observability/logger';
import { captureApiError } from '@/lib/observability/captureApiError';
import { normalizePartnerRef } from '@/lib/apply/applyReferralCapture';
import {
  buildSponsoredSeatWhere,
  isSeatCapReached,
  isSponsorshipActive,
  type SponsoredSeatWhere,
  type SponsorshipPartner,
} from '@/lib/partners/sponsorship';

/**
 * Partner columns the apply wizard is allowed to see.
 *
 * The sponsorship columns are here because the page cannot say "your seat is
 * sponsored" without them — `partnerType` alone says which QUESTIONS to ask,
 * never who is PAYING.
 */
export type SchoolApplyPartner = SponsorshipPartner & {
  id: string;
  name: string;
  slug: string;
  partnerType: string;
  schoolDistrict: string | null;
};

/** What `/apply` renders: the partner plus the resolved sponsorship state. */
export type ResolvedSchoolApplyPartner = SchoolApplyPartner & {
  /**
   * True only when the sponsorship is switched on, `now` is inside its window,
   * and its funded seats are not exhausted — the same three conditions
   * `/enroll/<slug>` gates its cost sentence on.
   */
  sponsorshipInForce: boolean;
};

/**
 * EXPLICIT SELECT, never a bare `findFirst`. Phase B3 review lesson: a bare
 * lookup drags internal notes, sponsorship/approval/rejection notes, school
 * contact PII, `stripeConnectId` and `organizationId` into a public,
 * unauthenticated view's props — where they ship to the browser in the RSC
 * payload.
 *
 * The sponsorship columns added in the B4 hardening pass are all non-sensitive
 * scheduling/limit data; the sponsorship NOTES column is deliberately still
 * absent.
 */
const SCHOOL_APPLY_PARTNER_SELECT = {
  id: true,
  name: true,
  slug: true,
  partnerType: true,
  schoolDistrict: true,
  sponsoredEnrollment: true,
  sponsorshipStartsAt: true,
  sponsorshipEndsAt: true,
  sponsorshipSeatCap: true,
} as const;

/** Partner types that get the school variant of the wizard. */
export const SCHOOL_PARTNER_TYPE = 'high_school';

/** Minimal Prisma seam so callers/tests never need a real database. */
export type SchoolApplyPartnerDb = {
  partner: {
    findFirst(args: {
      where: { active: boolean; OR: ({ referralCode: string } | { slug: string })[] };
      select: typeof SCHOOL_APPLY_PARTNER_SELECT;
    }): Promise<SchoolApplyPartner | null>;
  };
  courseEnrollment: {
    count(args: { where: SponsoredSeatWhere }): Promise<number>;
  };
};

export type ResolveSchoolApplyPartnerDeps = { db?: SchoolApplyPartnerDb; now?: Date };

/**
 * Picks the partner ref for an `/apply` request: the `?ref=` query param wins
 * so a fresh partner link can override a stale attribution cookie, exactly
 * like `POST /api/apply/signup` orders body-ref over cookie-ref.
 *
 * Both inputs are re-validated with `normalizePartnerRef` rather than
 * trusted — the query string is attacker-controlled and the cookie is
 * client-held state.
 */
export function resolveApplyPartnerRef(
  refParam: string | null | undefined,
  refCookie: string | null | undefined
): string | null {
  return normalizePartnerRef(refParam) ?? normalizePartnerRef(refCookie);
}

/**
 * Whether the partner's sponsorship may be described as in force RIGHT NOW.
 *
 * Mirrors `resolveSponsorship` in `lib/partners/enrollmentPage.ts`, which is
 * what Phase B3 hardened `/enroll/<slug>` with, and for the same reason: a
 * school outside its funding window, or one whose funded seats are gone, must
 * not be told "your seat is sponsored". The seat cap stays a SOFT cap for the
 * signup itself — this only decides what the copy is allowed to claim.
 *
 * Fails CLOSED. A seat count that throws returns false, i.e. the neutral copy:
 * under-claiming costs a little reassurance, over-claiming misrepresents who
 * is paying for a minor's training.
 */
async function resolveSponsorshipInForce(
  partner: SchoolApplyPartner,
  db: SchoolApplyPartnerDb,
  now: Date
): Promise<boolean> {
  if (!isSponsorshipActive(partner, now)) return false;

  const cap = partner.sponsorshipSeatCap;
  if (cap === null || cap === undefined) return true;

  try {
    // Cross-tenant by design, same as the partner lookup below: `/apply` is
    // unauthenticated so there is no actor org, and the count is already
    // narrowed to this one partner's id.
    const usedSeats = await db.courseEnrollment.count({
      where: buildSponsoredSeatWhere(partner),
    });
    return !isSeatCapReached(partner, usedSeats);
  } catch (err) {
    reportPartnerLookupFailure('apply: sponsored seat count failed; showing neutral copy', {
      partnerId: partner.id,
      err,
    });
    return false;
  }
}

/**
 * A partner lookup failing is NOT routine.
 *
 * It silently downgrades a school applicant to the adult workforce screener:
 * they get asked about their own employment status and household income, their
 * guardian is never captured, their application carries no school attribution,
 * and nothing anywhere says so. A `logger.warn` for that lands in console
 * output nobody reads. Escalate it to `logger.error` AND Sentry, following the
 * repo's `captureApiError` convention, so it pages someone.
 */
function reportPartnerLookupFailure(message: string, context: Record<string, unknown>): void {
  logger.error(message, context);
  captureApiError(context.err, {
    route: 'GET /apply#schoolApplyPartner',
    extra: { ...context, err: undefined },
  });
}

/**
 * Resolves the high-school partner behind an `/apply` visit, or null.
 *
 * Returns null (rather than throwing) for every non-school outcome — no ref,
 * an unknown/inactive partner, a partner that is not a high school, or a
 * database error. `/apply` is the top of the live funnel; a partner lookup
 * failing must degrade to the normal wizard, never to an error page — but it
 * is reported loudly, because the degraded funnel is wrong for that student in
 * ways nothing downstream can detect.
 *
 * NO REF MEANS NO QUERY: the common case (organic and paid traffic) must not
 * pay for a database round trip it cannot use.
 */
export async function resolveSchoolApplyPartner(
  ref: string | null,
  deps: ResolveSchoolApplyPartnerDeps = {}
): Promise<ResolvedSchoolApplyPartner | null> {
  if (!ref) return null;
  const db = deps.db ?? (prisma as unknown as SchoolApplyPartnerDb);
  const now = deps.now ?? new Date();

  let partner: SchoolApplyPartner | null = null;
  try {
    // Cross-tenant by design — the equivalent of wrapping this in
    // `crossTenantOK()` (lib/tenant/withTenantScope.ts). `/apply` is
    // unauthenticated, so there is no actor org to scope to; the ref IS the
    // selector, and both `Partner.slug` and `Partner.referralCode` are
    // globally unique. Documented rather than called because that helper
    // imports `server-only`, which this module avoids so it stays testable.
    partner = await db.partner.findFirst({
      where: { active: true, OR: [{ referralCode: ref }, { slug: ref }] },
      select: SCHOOL_APPLY_PARTNER_SELECT,
    });
  } catch (err) {
    reportPartnerLookupFailure(
      'apply: school partner lookup failed; falling back to the default wizard',
      { ref, err }
    );
    return null;
  }

  if (!partner || partner.partnerType !== SCHOOL_PARTNER_TYPE) return null;
  return {
    ...partner,
    sponsorshipInForce: await resolveSponsorshipInForce(partner, db, now),
  };
}
