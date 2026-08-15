/**
 * Partner enrollment page loader (Phase B3).
 *
 * Resolves everything `/enroll/[partnerSlug]` needs from the database:
 * the partner row, its curated program catalog (hydrated against the
 * canonical `PROGRAMS` data so cards can never drift from the detail
 * pages), and — only when it is genuinely in force — the sponsorship
 * banner copy.
 *
 * Adding a school is data entry: a `Partner` row with
 * `enrollmentPageEnabled = true` plus `PartnerProgramCatalog` rows. No code.
 *
 * Deliberately contains no React (no JSX, no `server-only`, no `next/*`) so
 * it is directly unit-testable and the page stays a thin renderer over it.
 * The Prisma client is injectable (`deps.db`) for the same reason — the tests
 * never touch a database.
 */

import { getProgramBySlug } from '@/lib/content/programs';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/observability/logger';
import {
  buildSponsoredSeatWhere,
  buildSponsorshipMessage,
  isSeatCapReached,
  isSponsorshipActive,
  type SponsoredSeatWhere,
  type SponsorshipPartner,
} from '@/lib/partners/sponsorship';

/**
 * Fallback catalog for a partner-school page whose `programCatalog` is empty.
 *
 * These are the five tracks Concordia High School launched with (Phase A).
 * A school row created without catalog rows is a data-entry omission, not an
 * instruction to show nothing — and a blank page in front of students days
 * before a rollout is the worst possible failure. Falling back keeps the page
 * useful while an admin fills the catalog in.
 *
 * ALL OR NOTHING: the fallback applies when the partner hydrates to zero
 * cards. Adding ONE `PartnerProgramCatalog` row therefore replaces all five
 * defaults with that one program — it does not append. Documented in
 * `docs/runbooks/CONCORDIA-LAUNCH.md` because it is a live foot-gun for
 * whoever curates a school's catalog.
 */
export const SCHOOL_DEFAULT_SLUGS: readonly string[] = [
  'it-support-professional-certificate-ibm',
  'cybersecurity-professional-certificate-google',
  'data-analytics-professional-certificate-google',
  'project-management-professional-certificate-microsoft',
  'ux-design-professional-certificate-google',
];

/** The `Partner` columns the enrollment page reads. */
export type EnrollmentPagePartner = SponsorshipPartner & {
  slug: string;
  referralCode: string;
  active: boolean;
  status: string;
  logoUrl: string | null;
  brandColor: string | null;
  schoolDistrict: string | null;
  enrollmentPageEnabled: boolean;
  enrollmentHeadline: string | null;
  enrollmentBlurb: string | null;
};

/** The `PartnerProgramCatalog` columns the enrollment page reads. */
export type EnrollmentCatalogRow = {
  programSlug: string;
  displayOrder: number;
  featured: boolean;
  note: string | null;
};

/** Partner row plus its ordered catalog, as loaded in one query. */
export type EnrollmentPartnerRecord = EnrollmentPagePartner & {
  programCatalog: EnrollmentCatalogRow[];
};

/**
 * Explicit column list for the partner query.
 *
 * `Partner` carries columns this page must never see: internal `notes`,
 * `sponsorshipNotes`, `approvalNotes`, `rejectionNotes`, the school's
 * `contactName`/`contactEmail`/`contactPhone`, `stripeConnectId`,
 * `organizationId`. A bare `findUnique` hands every one of them to the view.
 * Nothing serializes them today (the view is a Server Component), but this
 * page is one `'use client'` away from shipping a named school administrator's
 * direct email address to every student who opens the link. Select only what
 * renders.
 */
export const ENROLLMENT_PARTNER_SELECT = {
  id: true,
  name: true,
  slug: true,
  referralCode: true,
  active: true,
  status: true,
  logoUrl: true,
  brandColor: true,
  schoolDistrict: true,
  enrollmentPageEnabled: true,
  enrollmentHeadline: true,
  enrollmentBlurb: true,
  sponsoredEnrollment: true,
  sponsorshipFundingSource: true,
  sponsorshipTermLabel: true,
  sponsorshipStartsAt: true,
  sponsorshipEndsAt: true,
  sponsorshipSeatCap: true,
  programCatalog: {
    select: { programSlug: true, displayOrder: true, featured: true, note: true },
    orderBy: [{ displayOrder: 'asc' }, { programSlug: 'asc' }],
  },
} as const;

/**
 * The slice of the Prisma client this loader uses. Narrowing it to two calls
 * keeps the unit tests honest (a hand-written stub is a few lines) without
 * pretending to model Prisma's generics.
 */
export type EnrollmentPageDb = {
  partner: {
    findUnique(args: {
      where: { slug: string };
      select: typeof ENROLLMENT_PARTNER_SELECT;
    }): Promise<EnrollmentPartnerRecord | null>;
  };
  courseEnrollment: {
    count(args: { where: SponsoredSeatWhere }): Promise<number>;
  };
};

/** One program card, fully hydrated from the canonical catalog. */
export type EnrollmentProgramCard = {
  slug: string;
  title: string;
  categoryLabel: string;
  categoryColor: string;
  duration: string;
  /** e.g. `$55K–$72K` — an early-career estimate, always shown with its disclaimer. */
  salaryRange: string;
  /** Up to three, for the card's skill tags. */
  skills: string[];
  /** Credential partner (IBM, Google, …). */
  partner: string;
  featured: boolean;
  note: string | null;
};

/** Public cost copy for the page, generated by the shared helper. */
export type EnrollmentSponsorship = {
  /** From `buildSponsorshipMessage()` — the single source of public cost copy. */
  message: string;
  termLabel: string | null;
};

/**
 * Discriminated result so the page never has to guess why it got nothing:
 *  - `not-found` → no such partner, or the partner has no enrollment page.
 *  - `paused`    → the page exists but the partner is inactive. Students hold
 *                  printed links, so this renders a calm 200, never a 404.
 *  - `ok`        → render the page.
 */
export type EnrollmentPageData =
  | { kind: 'not-found' }
  | { kind: 'paused'; partner: EnrollmentPagePartner }
  | {
      kind: 'ok';
      partner: EnrollmentPagePartner;
      cards: EnrollmentProgramCard[];
      sponsorship: EnrollmentSponsorship | null;
    };

export type EnrollmentPageDeps = {
  /** Injected in tests; defaults to the app's Prisma client. */
  db?: EnrollmentPageDb;
  /** Injected in tests; defaults to `new Date()`. */
  now?: Date;
};

/**
 * Normalizes `Program.salary` ("Starting salary: $55K-$72K") to the compact
 * range the cards show ("$55K–$72K"). Mirrors `salaryRangeDisplay()` in the
 * marketing data module so the dynamic page reads identically to the static
 * page it replaces.
 */
export function formatSalaryRange(salary: string): string {
  const match = salary.match(/\$(\d+)K\s*[-–]\s*\$(\d+)K/i);
  if (match) return `$${parseInt(match[1], 10)}K–$${parseInt(match[2], 10)}K`;
  return salary.replace(/^Starting salary:\s*/i, '').trim();
}

/** A hydration pass: the cards that resolved, plus the slugs that did not. */
type CardBuild = { cards: EnrollmentProgramCard[]; unknownSlugs: string[] };

/**
 * Hydrates catalog slugs into cards, skipping anything that is not in the
 * canonical program list. A typo in one admin-entered catalog row must cost
 * that one card, not the whole page.
 *
 * Two subtleties:
 *  - DEDUPE ON THE RESOLVED SLUG, not the row's. `getProgramBySlug` also
 *    matches on title and alias, so two different catalog rows can hydrate to
 *    the same program — which would render the card twice and hand React two
 *    children with the same `key`.
 *  - Bad slugs are RETURNED, not logged here, so the caller can emit one line
 *    per request. This route is uncached and public: a per-row warn is a log
 *    amplifier pointed at us by anyone refreshing the page.
 */
function buildCards(
  rows: readonly { programSlug: string; featured: boolean; note: string | null }[]
): CardBuild {
  const cards: EnrollmentProgramCard[] = [];
  const unknownSlugs: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const program = getProgramBySlug(row.programSlug);
    if (!program) {
      unknownSlugs.push(row.programSlug);
      continue;
    }
    if (seen.has(program.slug)) continue;
    seen.add(program.slug);
    cards.push({
      slug: program.slug,
      title: program.title,
      categoryLabel: program.categoryLabel,
      categoryColor: program.categoryColor,
      duration: program.duration,
      salaryRange: formatSalaryRange(program.salary),
      skills: program.skills.slice(0, 3),
      partner: program.partner,
      featured: row.featured,
      note: row.note,
    });
  }
  return { cards, unknownSlugs };
}

/**
 * Resolves the sponsorship banner, or null when there must not be one.
 *
 * Null in three cases, and the page shows neutral guidance rather than any
 * cost claim in all of them: the sponsorship is off, `now` is outside the
 * window, or the funded seats for this term are gone. The seat cap is a soft
 * cap at signup (the student still enrolls), but promising "no cost" on a
 * page whose funding is exhausted is a promise we can't keep.
 */
async function resolveSponsorship(
  partner: EnrollmentPagePartner,
  db: EnrollmentPageDb,
  now: Date
): Promise<EnrollmentSponsorship | null> {
  if (!isSponsorshipActive(partner, now)) return null;

  const cap = partner.sponsorshipSeatCap;
  if (cap !== null && cap !== undefined) {
    // Cross-tenant by design — the equivalent of wrapping this in
    // `crossTenantOK()`, for the same reason as the partner lookup below: an
    // unauthenticated page has no actor org. The count is already narrowed to
    // this one partner's id, which the caller resolved from the URL slug.
    const usedSeats = await db.courseEnrollment.count({
      where: buildSponsoredSeatWhere(partner),
    });
    if (isSeatCapReached(partner, usedSeats)) return null;
  }

  // The remaining-seat NUMBER is deliberately not returned. It is live scarcity
  // copy ("3 sponsored seats remaining") on a page aimed at minors and their
  // families, it was never on the page this replaced, and the cap already does
  // the only job it needs to do here: suppress the cost claim once the funding
  // is gone.
  return {
    message: buildSponsorshipMessage(partner),
    termLabel: partner.sponsorshipTermLabel?.trim() || null,
  };
}

/**
 * Loads everything `/enroll/<slug>` renders. The URL segment IS the partner
 * slug (see `lib/partners/chsPartner.ts`), so this is a direct lookup.
 */
export async function getEnrollmentPageData(
  slug: string,
  deps: EnrollmentPageDeps = {}
): Promise<EnrollmentPageData> {
  // One documented cast at the injection point: Prisma's generated client is
  // structurally compatible with (and much wider than) `EnrollmentPageDb`,
  // but its overloaded generic signatures don't assign cleanly to a
  // hand-written seam.
  const db = deps.db ?? (prisma as unknown as EnrollmentPageDb);
  const now = deps.now ?? new Date();

  // Cross-tenant by design — the equivalent of wrapping this in
  // `crossTenantOK()` (lib/tenant/withTenantScope.ts), which marks an
  // intentional bypass for scripts/audit-tenant-scoping.cjs. This is an
  // unauthenticated public page: there is no actor and therefore no org to
  // scope to, the URL slug IS the tenant selector, and `Partner.slug` is
  // globally unique so the lookup is unambiguous. Documented here rather than
  // called because that helper imports `server-only`, which this module
  // deliberately does not (see the header) so it stays unit-testable.
  const partner = await db.partner.findUnique({
    where: { slug },
    select: ENROLLMENT_PARTNER_SELECT,
  });

  // No partner, or the partner has no enrollment page: genuinely nothing here.
  if (!partner || partner.enrollmentPageEnabled === false) return { kind: 'not-found' };

  const { programCatalog, ...partnerFields } = partner;

  // The page is enabled but the partner is switched off. Students are holding
  // printed links — explain, don't 404.
  if (!partnerFields.active || partnerFields.status !== 'active') {
    return { kind: 'paused', partner: partnerFields };
  }

  // Fall back on the HYDRATED result, not on the row count. A catalog whose
  // rows all reference unknown slugs is functionally the same data-entry
  // omission as an empty catalog, and gating the fallback on `length > 0` sent
  // students a page reading "0 Certificate programs" with nothing to apply to.
  const primary = buildCards(programCatalog);
  let cards = primary.cards;
  let usedFallback = false;
  if (cards.length === 0) {
    usedFallback = true;
    cards = buildCards(
      SCHOOL_DEFAULT_SLUGS.map((programSlug) => ({ programSlug, featured: false, note: null }))
    ).cards;
  }

  // One line per request, listing every bad slug — not one line per bad row on
  // an uncached public route.
  if (primary.unknownSlugs.length > 0) {
    logger.warn('enrollmentPage: catalog rows reference unknown program slugs', {
      partnerSlug: partnerFields.slug,
      programSlugs: primary.unknownSlugs,
      unknownCount: primary.unknownSlugs.length,
      usedFallback,
    });
  }

  const sponsorship = await resolveSponsorship(partnerFields, db, now);

  return { kind: 'ok', partner: partnerFields, cards, sponsorship };
}
