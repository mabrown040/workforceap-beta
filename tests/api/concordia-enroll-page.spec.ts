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
  contrastWithWhite,
  resolveAccentColor,
  resolveCategoryPillColor,
  resolveLogoUrl,
} from '@/app/enroll/[partnerSlug]/PartnerEnrollmentView';
import {
  getEnrollmentPageData,
  type EnrollmentPageDb,
  type EnrollmentPartnerRecord,
} from '@/lib/partners/enrollmentPage';
import { buildSponsorshipMessage } from '@/lib/partners/sponsorship';
import {
  normalizeDecodedPartnerRef,
  partnerRefFromEnrollPath,
} from '@/lib/apply/applyReferralCapture';
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
const CSS_PATH = path.join(REPO_ROOT, 'app/enroll/[partnerSlug]/partner-enroll.css');
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

    // Names BOTH parties. "our partnership with Concordia High School" is
    // circular on Concordia's own page — "our" has no referent there.
    expect(html).toContain('WorkforceAP–Concordia High School partnership');
    expect(html).not.toMatch(/our partnership/i);
    // And the claim is scoped to enrolling in the programs on this page, not
    // to everything a student might ever buy from us.
    expect(html).toContain('to enroll in these certificate programs');

    // The page must not carry its own copy of the sentence (the duplication
    // that the static Astro page forced, closed in Phase B3).
    for (const source of [readFileSync(PAGE_PATH, 'utf-8'), readFileSync(VIEW_PATH, 'utf-8')]) {
      expect(source).not.toMatch(/no cost to/i);
    }
  });

  it('never uses the banned no-cost adjective — somebody paid for these seats', async () => {
    const { html } = await renderEnrollPage();
    expect(html).not.toMatch(/\bfree\b/i);
    for (const file of [
      PAGE_PATH,
      VIEW_PATH,
      CSS_PATH,
      path.join(REPO_ROOT, 'lib/partners/enrollmentPage.ts'),
      path.join(REPO_ROOT, 'lib/partners/sponsorship.ts'),
      path.join(REPO_ROOT, 'lib/partners/chsPartnerProvisioning.ts'),
      path.join(REPO_ROOT, 'docs/runbooks/CONCORDIA-LAUNCH.md'),
    ]) {
      expect(readFileSync(file, 'utf-8'), `${file} uses the banned adjective`).not.toMatch(
        /\bfree\b/i
      );
    }
  });

  it('decodes the route param at exactly one layer', async () => {
    // Next decodes route params before the page sees them, so the page must
    // use the non-decoding validator. Decoding twice resolved
    // `/enroll/%2563oncordia` — which arrives as `%63oncordia` — to the real
    // page, while middleware (one decode of the raw path) rejected it and
    // planted no attribution cookie. The student would have seen a working
    // page that attributed to nobody.
    const source = readFileSync(PAGE_PATH, 'utf-8');
    // Every call site uses the non-decoding validator; the decoding one is not
    // even imported here.
    expect(source).toMatch(
      /import \{ normalizeDecodedPartnerRef \} from '@\/lib\/apply\/applyReferralCapture'/
    );
    expect(source).not.toMatch(/[^a-zA-Z]normalizePartnerRef\(/);
    expect(source.match(/normalizeDecodedPartnerRef\(/g)?.length).toBe(2);

    expect(normalizeDecodedPartnerRef('%63oncordia')).toBeNull();
    expect(normalizeDecodedPartnerRef(CHS_PARTNER_SLUG)).toBe(CHS_PARTNER_SLUG);
    // Middleware's view of the same URL — unchanged, and still a rejection.
    expect(partnerRefFromEnrollPath('/enroll/%2563oncordia')).toBeNull();
    expect(partnerRefFromEnrollPath(`/enroll/${CHS_PARTNER_SLUG}`)).toBe(CHS_PARTNER_SLUG);
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

  it('shows no funding pill at all when the sponsorship is not in force', async () => {
    // High-school students are generally not WIOA-eligible, so the program's
    // generic "WIOA/Grant" badge on a school page reads as a funding claim
    // about them. With no sponsorship there is no funding badge.
    const { html } = await renderEnrollPage({}, new Date('2027-06-01T00:00:00Z'));
    expect(html).not.toContain('pen-fund-pill');
    expect(html).not.toMatch(/WIOA/i);
    expect(html).not.toMatch(/\bgrant\b/i);

    // In force, the pill says only that the enrollment is sponsored.
    const { html: sponsored } = await renderEnrollPage();
    expect(sponsored).toContain('pen-fund-pill');
    expect(sponsored).toMatch(/Sponsored for 2026/);
    expect(sponsored).not.toMatch(/WIOA/i);
  });

  it('makes no public scarcity claim about remaining sponsored seats', async () => {
    // "1 sponsored seats remaining this term" — wrong plural, never on the page
    // this replaced, and live scarcity pressure aimed at minors and families.
    const data = await getEnrollmentPageData(CHS_PARTNER_SLUG, {
      db: stubDb(chsPartnerRecord({ sponsorshipSeatCap: 30 }), 29),
      now: IN_TERM,
    });
    if (data.kind !== 'ok') throw new Error('expected ok');
    const html = renderToStaticMarkup(
      createElement(PartnerEnrollmentView, {
        partner: data.partner,
        cards: data.cards,
        sponsorship: data.sponsorship,
      })
    );
    expect(html).not.toMatch(/seats? remaining/i);
    expect(html).not.toMatch(/\bseats\b/i);
    // The cap still does its real job: it suppresses the cost claim when full.
    expect(data.sponsorship).not.toBeNull();
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

  it('gives the FAQ disclosures a visible open/close affordance', async () => {
    // The stylesheet hides the native marker on both engines, so it MUST
    // supply a replacement — otherwise five bold rows read as static headings
    // and the cost, under-18 consent and income-question answers stay hidden.
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toContain('.pen-faq-item summary::-webkit-details-marker');
    expect(css).toMatch(/\.pen-faq-item summary\s*\{[^}]*list-style:\s*none/);
    // Replacement marker, mirroring the site's `.faq-item` pattern in main.css.
    expect(css).toMatch(/\.pen-faq-item summary::after\s*\{[^}]*content:\s*'\+'/);
    expect(css).toMatch(/\.pen-faq-item\[open\] summary::after\s*\{[^}]*rotate\(45deg\)/);
    // Room for it, so it never overlaps the question text.
    expect(css).toMatch(/\.pen-faq-item summary\s*\{[^}]*padding:\s*1rem 3rem 1rem 1\.15rem/);
  });

  it('keeps CTAs full-width on phones', async () => {
    // The `min-width: 640px` override (`flex: 0 0 auto`) is only meaningful if
    // the base rule sets a flex basis. Without it the buttons shrink-wrapped at
    // every width and the media query was dead code.
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).toMatch(/\.pen-acts \.mdx-btn\s*\{[^}]*flex:\s*1 1 100%/);
    expect(css).toMatch(/\.pen-acts \.mdx-btn\s*\{[^}]*flex:\s*0 0 auto/);
  });

  it('does not double-count the marketing nav height above the H1', async () => {
    // `/enroll/*` is a marketing route, so the root layout already renders an
    // in-flow `.main-nav-layout-spacer` the height of the fixed nav. Adding
    // `var(--nav-height-default)` to the hero padding counted it twice.
    const css = readFileSync(CSS_PATH, 'utf-8');
    expect(css).not.toContain('--nav-height-default');
  });

  it('uses partner branding only after validating it, never raw DB text in CSS', async () => {
    expect(resolveAccentColor('#1E3A8A')).toBe('#1E3A8A');
    expect(resolveAccentColor('red; background:url(javascript:alert(1))')).toBeNull();
    expect(resolveAccentColor(null)).toBeNull();

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

  it('rejects a brand color too light to read, rather than rendering white on yellow', async () => {
    // The accent is a white-on-accent background (step numbers) AND text on the
    // light surface (salary figure, FAQ links). A hex-valid but bright brand
    // color passed the old syntax-only check and made all three unreadable.
    for (const tooLight of ['#fff', '#ffd400', '#7fffd4', '#eeeeee']) {
      expect(resolveAccentColor(tooLight), `${tooLight} should be rejected`).toBeNull();
      expect(contrastWithWhite(tooLight)).toBeLessThan(4.5);
    }
    // Dark brand colors still come through.
    for (const ok of ['#1E3A8A', '#ad2c4d', '#004d40', '#000']) {
      expect(resolveAccentColor(ok), `${ok} should be accepted`).toBe(ok);
      expect(contrastWithWhite(ok)).toBeGreaterThanOrEqual(4.5);
    }

    const { html } = await renderEnrollPage({ brandColor: '#ffd400' });
    // Falls back to the house crimson supplied by partner-enroll.css.
    expect(html).not.toContain('--pen-accent');
  });

  it('accepts a logo only where the CSP img-src allowlist can actually load it', async () => {
    // Site-relative always works.
    expect(resolveLogoUrl('/images/logo.png')).toBe('/images/logo.png');
    // Hosts on the next.config.ts img-src allowlist render.
    expect(resolveLogoUrl('https://abcdef.supabase.co/storage/logo.png')).toBe(
      'https://abcdef.supabase.co/storage/logo.png'
    );
    expect(resolveLogoUrl('https://xyz.public.blob.vercel-storage.com/logo.png')).toBe(
      'https://xyz.public.blob.vercel-storage.com/logo.png'
    );

    // An arbitrary https host is BLOCKED by CSP, so it would render as a broken
    // image on a page a school is about to email to every family. No logo looks
    // intentional; a broken one looks like the site is broken.
    expect(resolveLogoUrl('https://cdn.example.org/logo.png')).toBeNull();
    expect(resolveLogoUrl('https://chsaustin.org/logo.png')).toBeNull();
    // …and near-misses on the allowlist patterns don't sneak through.
    expect(resolveLogoUrl('https://evil.com/supabase.co/logo.png')).toBeNull();
    expect(resolveLogoUrl('https://supabase.co.evil.com/logo.png')).toBeNull();

    expect(resolveLogoUrl('javascript:alert(1)')).toBeNull();
    expect(resolveLogoUrl('data:image/svg+xml;base64,AAAA')).toBeNull();
    expect(resolveLogoUrl('http://images.unsplash.com/logo.png')).toBeNull();
    expect(resolveLogoUrl(null)).toBeNull();
    expect(resolveLogoUrl('   ')).toBeNull();
  });

  it('rejects protocol-relative logos written with a backslash', async () => {
    // The URL parser reads `\` as `/`, so `/\evil.example/x` is protocol-
    // relative to a browser while passing a naive `startsWith('//')` check.
    expect(resolveLogoUrl('//evil.example/logo.png')).toBeNull();
    expect(resolveLogoUrl('/\\evil.example/logo.png')).toBeNull();
    expect(resolveLogoUrl('/\\\\evil.example/logo.png')).toBeNull();
    expect(resolveLogoUrl('\\/evil.example/logo.png')).toBeNull();

    const { html } = await renderEnrollPage({ logoUrl: '/\\evil.example/logo.png' });
    expect(html).not.toContain('evil.example');
  });

  it('darkens category pills until white pill text clears WCAG AA', async () => {
    // `business` (#a47f38, 3.70:1) and `healthcare` (#4a9b4f, 3.45:1) fail
    // against white at the pill's 12px bold. The static page used the darker
    // gold on purpose.
    for (const raw of ['#a47f38', '#4a9b4f', '#666666', '#2b7bb9', '#8b4a9b', '#ad2c4d']) {
      expect(contrastWithWhite(resolveCategoryPillColor(raw))).toBeGreaterThanOrEqual(4.5);
    }
    // Colors that already pass are returned untouched — no gratuitous redesign.
    expect(resolveCategoryPillColor('#ad2c4d')).toBe('#ad2c4d');
    // Failing ones are darkened, not replaced with some other hue.
    expect(resolveCategoryPillColor('#a47f38')).not.toBe('#a47f38');
    expect(resolveCategoryPillColor('#a47f38')).toMatch(/^#[0-9a-f]{6}$/);

    const { data, html } = await renderEnrollPage();
    for (const card of data.cards) {
      expect(html).toContain(`background:${resolveCategoryPillColor(card.categoryColor)}`);
    }
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
