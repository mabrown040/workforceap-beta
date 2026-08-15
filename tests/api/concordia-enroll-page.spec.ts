import { describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

// The page's Prisma import must never construct a real client in a unit test;
// every query below goes through the injected `db` seam instead.
vi.mock('@/lib/db/prisma', () => ({ prisma: {} }));
// `ApplyRefCapture` is a client component (useSearchParams) — it has no router
// here. Its own behavior is covered by tests/e2e/concordia-referral.spec.ts.
vi.mock('@/components/apply/ApplyRefCapture', () => ({ default: () => null }));

import PartnerEnrollmentView, {
  NO_SPONSORSHIP_GUIDANCE,
  SALARY_RANGE_DISCLAIMER,
  buildApplyHref,
  resolveAccentColor,
  resolveLogoUrl,
} from '@/app/enroll/[partnerSlug]/PartnerEnrollmentView';
import {
  getEnrollmentPageData,
  type EnrollmentPageDb,
  type EnrollmentPartnerRecord,
} from '@/lib/partners/enrollmentPage';
import { buildSponsorshipMessage } from '@/lib/partners/sponsorship';
import {
  CHS_PARTNER_NAME,
  CHS_PARTNER_REFERRAL_CODE,
  CHS_PARTNER_SLUG,
  CHS_SPONSORSHIP_ENDS_AT,
  CHS_SPONSORSHIP_STARTS_AT,
  CHS_SPONSORSHIP_TERM_LABEL,
} from '@/lib/partners/chsPartner';

const REPO_ROOT = path.resolve(__dirname, '../..');
const PAGE_PATH = path.join(REPO_ROOT, 'app/enroll/[partnerSlug]/page.tsx');
const VIEW_PATH = path.join(REPO_ROOT, 'app/enroll/[partnerSlug]/PartnerEnrollmentView.tsx');
const IN_TERM = new Date('2026-08-15T12:00:00Z');

/** Rendered markup escapes `&` in href query strings. */
function attrHref(href: string): string {
  return `href="${href.replace(/&/g, '&amp;')}"`;
}

function chsPartnerRecord(
  overrides: Partial<EnrollmentPartnerRecord> = {}
): EnrollmentPartnerRecord {
  return {
    id: 'partner-chs',
    name: CHS_PARTNER_NAME,
    slug: CHS_PARTNER_SLUG,
    referralCode: CHS_PARTNER_REFERRAL_CODE,
    active: true,
    status: 'active',
    logoUrl: null,
    brandColor: null,
    schoolDistrict: null,
    enrollmentPageEnabled: true,
    enrollmentHeadline: null,
    enrollmentBlurb: null,
    sponsoredEnrollment: true,
    sponsorshipFundingSource: null,
    sponsorshipTermLabel: CHS_SPONSORSHIP_TERM_LABEL,
    sponsorshipStartsAt: CHS_SPONSORSHIP_STARTS_AT,
    sponsorshipEndsAt: CHS_SPONSORSHIP_ENDS_AT,
    sponsorshipSeatCap: null,
    programCatalog: [],
    ...overrides,
  };
}

function stubDb(partner: EnrollmentPartnerRecord | null, usedSeats = 0): EnrollmentPageDb {
  return {
    partner: { findUnique: async () => partner },
    courseEnrollment: { count: async () => usedSeats },
  };
}

/** Renders the real page body from the real loader output — no database. */
async function renderEnrollPage(
  overrides: Partial<EnrollmentPartnerRecord> = {},
  now: Date = IN_TERM
) {
  const data = await getEnrollmentPageData(CHS_PARTNER_SLUG, {
    db: stubDb(chsPartnerRecord(overrides)),
    now,
  });
  if (data.kind !== 'ok') throw new Error(`expected ok page data, got ${data.kind}`);
  const html = renderToStaticMarkup(
    createElement(PartnerEnrollmentView, {
      partner: data.partner,
      cards: data.cards,
      sponsorship: data.sponsorship,
    })
  );
  return { data, html };
}

describe('Partner enrollment page — /enroll/[partnerSlug] (replaces the static Concordia page)', () => {
  it('is served by a dynamic route whose URL segment IS the partner slug', async () => {
    // The page path, the printed student link, and Partner.slug are one value.
    // If they drift, middleware captures a ref that resolves to no partner and
    // every student who uses the official link loses attribution and their
    // funding stamp, silently.
    expect(existsSync(PAGE_PATH)).toBe(true);

    // The static page this replaced must be gone, or the Astro build output
    // (copied into public/ by vercel.json) would keep shadowing the route at
    // the same URL.
    expect(
      existsSync(
        path.join(REPO_ROOT, `marketing/src/pages/enroll/${CHS_PARTNER_SLUG}.astro`)
      )
    ).toBe(false);

    // And the route resolves the slug it is given.
    const data = await getEnrollmentPageData(CHS_PARTNER_SLUG, {
      db: stubDb(chsPartnerRecord()),
      now: IN_TERM,
    });
    expect(data.kind).toBe('ok');
  });

  it('routes every apply CTA through the partner referral code plus enrollment UTMs', async () => {
    const { data, html } = await renderEnrollPage();

    // Generic CTA: referral code, no program.
    const genericHref = buildApplyHref(data.partner);
    expect(genericHref).toBe(
      `/apply?ref=${CHS_PARTNER_REFERRAL_CODE}&src=enroll&utm_source=school` +
        `&utm_medium=enrollment_page&utm_campaign=${CHS_PARTNER_SLUG}`
    );
    expect(html).toContain(attrHref(genericHref));

    // Per-program CTAs: referral code AND program slug.
    expect(data.cards.length).toBeGreaterThanOrEqual(5);
    for (const card of data.cards) {
      const href = buildApplyHref(data.partner, card.slug);
      expect(href).toContain(`ref=${CHS_PARTNER_REFERRAL_CODE}`);
      expect(href).toContain(`program=${card.slug}`);
      expect(html, `missing Get Started CTA for ${card.slug}`).toContain(attrHref(href));
      expect(html).toContain(`href="/programs/${card.slug}"`);
    }
    expect(html).toContain('Get Started');
  });

  it('lists only slugs that exist in the canonical PROGRAMS data', async () => {
    const { data } = await renderEnrollPage();
    // Unknown slugs are dropped by the loader, so a full fallback list proves
    // every default slug still resolves against the canonical catalog.
    expect(data.cards).toHaveLength(5);
    for (const card of data.cards) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.duration.length).toBeGreaterThan(0);
      expect(card.salaryRange).toMatch(/^\$\d+K–\$\d+K$/);
      expect(card.skills.length).toBeLessThanOrEqual(3);
    }
  });

  it('takes its cost copy from the shared sponsorship helper — never a local sentence', async () => {
    const { data, html } = await renderEnrollPage();
    const expected = buildSponsorshipMessage(chsPartnerRecord());

    expect(data.sponsorship?.message).toBe(expected);
    expect(html).toContain(expected);
    expect(html).toMatch(/no cost to Concordia High School students/i);
    expect(html).toContain(CHS_SPONSORSHIP_TERM_LABEL);

    // The page must not carry its own copy of the sentence (the duplication
    // that the static Astro page forced, closed in Phase B3).
    for (const source of [readFileSync(PAGE_PATH, 'utf-8'), readFileSync(VIEW_PATH, 'utf-8')]) {
      expect(source).not.toMatch(/no cost to/i);
    }
  });

  it('never uses the banned no-cost adjective — somebody paid for these seats', async () => {
    const { html } = await renderEnrollPage();
    expect(html).not.toMatch(/\bfree\b/i);
    expect(readFileSync(PAGE_PATH, 'utf-8')).not.toMatch(/\bfree\b/i);
    expect(readFileSync(VIEW_PATH, 'utf-8')).not.toMatch(/\bfree\b/i);
    expect(
      readFileSync(path.join(REPO_ROOT, 'lib/partners/enrollmentPage.ts'), 'utf-8')
    ).not.toMatch(/\bfree\b/i);
  });

  it('makes NO cost claim when the sponsorship is not in force', async () => {
    // Outside the sponsorship window.
    const { html } = await renderEnrollPage({}, new Date('2027-06-01T00:00:00Z'));
    expect(html).not.toMatch(/no cost/i);
    expect(html).not.toMatch(/\bsponsored\b/i);
    expect(html).toContain(NO_SPONSORSHIP_GUIDANCE);
    // The programs still render — only the cost claim goes away.
    expect(html).toContain('Get Started');
  });

  it('suppresses the cost claim once the funded seats for the term are gone', async () => {
    const data = await getEnrollmentPageData(CHS_PARTNER_SLUG, {
      db: stubDb(chsPartnerRecord({ sponsorshipSeatCap: 30 }), 30),
      now: IN_TERM,
    });
    if (data.kind !== 'ok') throw new Error('expected ok');
    expect(data.sponsorship).toBeNull();
  });

  it('shows the salary range with the Lightcast/BLS disclaimer on every card', async () => {
    const { data, html } = await renderEnrollPage();
    expect(SALARY_RANGE_DISCLAIMER).toMatch(
      /national early-career estimate \(Lightcast\/BLS, Jan 2026\)/
    );
    expect(html.split(SALARY_RANGE_DISCLAIMER).length - 1).toBe(data.cards.length);
    for (const card of data.cards) {
      expect(html).toContain(card.salaryRange);
    }
  });

  it('renders the co-branded hero, how-it-works, program and FAQ sections', async () => {
    const { html } = await renderEnrollPage();
    expect(html).toContain(`${CHS_PARTNER_NAME} Partnership`);
    expect(html).toContain(`WorkforceAP × ${CHS_PARTNER_NAME}`);
    expect(html).toContain('<h1');
    expect(html).toContain('Four steps from here to certified');
    expect(html).toContain('Questions students and families ask');
    expect(html).toContain('About 10 minutes to apply');
    expect(html).toContain('id="pen-programs"');
    // FAQ keeps the five student/family questions.
    expect(html.split('<details').length - 1).toBe(5);
  });

  it('uses partner branding only after validating it, never raw DB text in CSS', async () => {
    expect(resolveAccentColor('#1E3A8A')).toBe('#1E3A8A');
    expect(resolveAccentColor('#fff')).toBe('#fff');
    expect(resolveAccentColor('red; background:url(javascript:alert(1))')).toBeNull();
    expect(resolveAccentColor(null)).toBeNull();

    expect(resolveLogoUrl('/images/logo.png')).toBe('/images/logo.png');
    expect(resolveLogoUrl('https://cdn.example.org/logo.png')).toBe(
      'https://cdn.example.org/logo.png'
    );
    expect(resolveLogoUrl('javascript:alert(1)')).toBeNull();
    expect(resolveLogoUrl('//evil.example/logo.png')).toBeNull();

    const { html } = await renderEnrollPage({
      brandColor: '#1E3A8A',
      logoUrl: '/images/logo-tight.svg',
    });
    expect(html).toContain('--pen-accent:#1E3A8A');
    expect(html).toContain('src="/images/logo-tight.svg"');

    const { html: rejected } = await renderEnrollPage({
      brandColor: 'red;position:fixed',
      logoUrl: 'javascript:alert(1)',
    });
    expect(rejected).not.toContain('--pen-accent');
    expect(rejected).not.toContain('javascript:');
  });

  it('honors the partner headline and blurb when they are set', async () => {
    const { html } = await renderEnrollPage({
      enrollmentHeadline: 'Concordia Cardinals: your certification starts senior year',
      enrollmentBlurb: 'Five tracks, chosen with your counselors.',
    });
    expect(html).toContain('Concordia Cardinals: your certification starts senior year');
    expect(html).toContain('Five tracks, chosen with your counselors.');
  });

  it('is excluded from search indexing and never served from a stale cache', () => {
    const source = readFileSync(PAGE_PATH, 'utf-8');
    expect(source).toContain("export const dynamic = 'force-dynamic'");
    expect(source).toMatch(/robots\s*=\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
    // Every metadata branch passes it.
    expect(source.match(/\brobots,/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('answers a paused partner with a 200 explainer, never a 404', () => {
    const source = readFileSync(PAGE_PATH, 'utf-8');
    // notFound() is reachable only from the not-found branch.
    expect(source).toContain("if (data.kind === 'not-found') notFound()");
    expect(source.match(/notFound\(\)/g)?.length).toBe(1);
    expect(source).toMatch(
      /Enrollment through \{data\.partner\.name\} is temporarily paused/
    );
    expect(source).toContain('href="/programs"');
  });
});
