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
 * Deliberately contains no React and no `next/*` import (same reasoning as
 * `lib/partners/enrollmentPage.ts`) so it is directly unit-testable, with the
 * Prisma client injectable through `deps.db`.
 */

import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/observability/logger';
import { normalizePartnerRef } from '@/lib/apply/applyReferralCapture';

/** Partner columns the apply wizard is allowed to see. */
export type SchoolApplyPartner = {
  id: string;
  name: string;
  slug: string;
  partnerType: string;
  schoolDistrict: string | null;
};

/**
 * EXPLICIT SELECT, never a bare `findFirst`. Phase B3 review lesson: a bare
 * lookup drags internal notes, sponsorship/approval/rejection notes, school
 * contact PII, `stripeConnectId` and `organizationId` into a public,
 * unauthenticated view's props — where they ship to the browser in the RSC
 * payload.
 */
const SCHOOL_APPLY_PARTNER_SELECT = {
  id: true,
  name: true,
  slug: true,
  partnerType: true,
  schoolDistrict: true,
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
};

export type ResolveSchoolApplyPartnerDeps = { db?: SchoolApplyPartnerDb };

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
 * Resolves the high-school partner behind an `/apply` visit, or null.
 *
 * Returns null (rather than throwing) for every non-school outcome — no ref,
 * an unknown/inactive partner, a partner that is not a high school, or a
 * database error. `/apply` is the top of the live funnel; a partner lookup
 * failing must degrade to the normal wizard, never to an error page.
 *
 * NO REF MEANS NO QUERY: the common case (organic and paid traffic) must not
 * pay for a database round trip it cannot use.
 */
export async function resolveSchoolApplyPartner(
  ref: string | null,
  deps: ResolveSchoolApplyPartnerDeps = {}
): Promise<SchoolApplyPartner | null> {
  if (!ref) return null;
  const db = deps.db ?? (prisma as unknown as SchoolApplyPartnerDb);

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
    logger.warn('apply: school partner lookup failed; falling back to the default wizard', {
      ref,
      err,
    });
    return null;
  }

  if (!partner || partner.partnerType !== SCHOOL_PARTNER_TYPE) return null;
  return partner;
}
