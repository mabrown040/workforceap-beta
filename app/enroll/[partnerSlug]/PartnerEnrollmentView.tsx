import { Suspense } from 'react';
import type { CSSProperties } from 'react';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import type {
  EnrollmentPagePartner,
  EnrollmentProgramCard,
  EnrollmentSponsorship,
} from '@/lib/partners/enrollmentPage';

/**
 * Presentation for `/enroll/[partnerSlug]` (Phase B3).
 *
 * Pure and synchronous: everything it renders is handed to it by
 * `getEnrollmentPageData()`. That keeps the copy guards testable without a
 * database and keeps the page component a thin loader → render shim.
 *
 * COPY RULES (product stake — these students are minors and their families):
 *  - Public cost copy comes from ONE place: `buildSponsorshipMessage()`, via
 *    `sponsorship.message`. Never write a cost sentence here.
 *  - No sponsorship in force → no cost claim at all, just neutral guidance.
 *  - Somebody pays for these seats. The bare no-cost adjective this copy
 *    deliberately avoids is banned on this surface, pinned by a regex in
 *    `tests/api/concordia-enroll-page.spec.ts`.
 */

/** Salary-estimate disclaimer. Same wording the static Concordia page shipped. */
export const SALARY_RANGE_DISCLAIMER =
  'Salary range is a national early-career estimate (Lightcast/BLS, Jan 2026). Actual pay depends on experience, employer, and location.';

/** Shown in place of any cost claim when no sponsorship is in force. */
export const NO_SPONSORSHIP_GUIDANCE =
  'Talk to your counselor about program options and how your training is funded.';

/** Every apply CTA carries this so the funnel measures the school link. */
const ENROLL_UTM = {
  src: 'enroll',
  utm_source: 'school',
  utm_medium: 'enrollment_page',
} as const;

/** `#rgb` / `#rrggbb` only. */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** WCAG AA for normal-size text. */
const MIN_CONTRAST_ON_WHITE = 4.5;

/** Expands `#abc` to `[0xaa, 0xbb, 0xcc]`. Assumes `HEX_COLOR` already matched. */
function hexChannels(hex: string): [number, number, number] {
  const body = hex.slice(1);
  const full =
    body.length === 3
      ? body
          .split('')
          .map((c) => c + c)
          .join('')
      : body;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexChannels(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio of `hex` against pure white — every use below is white-on-color. */
export function contrastWithWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05);
}

/**
 * Partner brand colors are admin-entered text. Two independent checks:
 *
 *  1. SYNTAX — never interpolate raw DB text into a style. Must be a hex
 *     literal or it is dropped.
 *  2. LUMINANCE — the accent is used as a white-on-accent background (the
 *     step numbers) and as text on the light surface (the salary figure, the
 *     FAQ links, the note border). A bright brand color passes the hex check
 *     and then renders white on yellow. Reject anything that cannot clear
 *     WCAG AA against white and fall back to the house crimson, which the
 *     stylesheet supplies as the `--pen-accent` default.
 */
export function resolveAccentColor(brandColor: string | null | undefined): string | null {
  if (!brandColor) return null;
  const candidate = brandColor.trim();
  if (!HEX_COLOR.test(candidate)) return null;
  return contrastWithWhite(candidate) >= MIN_CONTRAST_ON_WHITE ? candidate : null;
}

/**
 * Category pill background, darkened until white 12px text on it clears WCAG AA.
 *
 * The canonical `PROGRAM_CATEGORY_COLORS` are chosen for icons and rules, not
 * for reversed-out pill text: `business` (#a47f38) is 3.70:1 and `healthcare`
 * (#4a9b4f) is 3.45:1 against white. The static page this replaced used the
 * darker gold deliberately. Scaling the channels keeps the hue — the pill still
 * reads as that category's color — while clearing the threshold, and colors
 * that already pass are returned untouched.
 */
export function resolveCategoryPillColor(categoryColor: string): string {
  if (!HEX_COLOR.test(categoryColor)) return 'var(--pen-accent)';
  let channels = hexChannels(categoryColor);
  let hex = categoryColor;
  // Bounded: each step removes ~18% of each channel, so black is reached long
  // before the limit and the loop cannot spin.
  for (let step = 0; step < 12 && contrastWithWhite(hex) < MIN_CONTRAST_ON_WHITE; step += 1) {
    channels = channels.map((c) => Math.round(c * 0.82)) as [number, number, number];
    hex = `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
  }
  return hex;
}

/**
 * Image hosts the app's Content-Security-Policy `img-src` actually permits.
 * MUST mirror the `img-src` directive in `next.config.ts`.
 */
const CSP_IMG_HOSTS: readonly (string | RegExp)[] = [
  /^[a-z0-9-]+\.supabase\.co$/i,
  /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/i,
  'images.unsplash.com',
  'api.dicebear.com',
  'www.google-analytics.com',
  'www.googletagmanager.com',
];

function isCspAllowedImageHost(hostname: string): boolean {
  return CSP_IMG_HOSTS.some((h) =>
    typeof h === 'string' ? h === hostname.toLowerCase() : h.test(hostname)
  );
}

/** Origin used only to resolve site-relative candidates; never emitted. */
const RELATIVE_BASE = 'https://partner-logo.invalid';

/**
 * Validates a partner logo URL, or returns null so the page renders NO logo.
 *
 * Two reasons this is narrower than "any https URL":
 *
 *  - CSP. `img-src` in `next.config.ts` is an explicit allowlist, so an
 *    external school logo does not render — it renders as a BROKEN image on a
 *    page a school is about to email to every family. No logo looks
 *    intentional; a broken one looks like the site is broken. Degrade to none.
 *  - `startsWith('//')` was not enough. The URL parser treats `\` as `/`, so
 *    `/\evil.example/logo.png` is protocol-relative to a browser while passing
 *    a leading-`/` check. Resolve and compare origins instead of pattern
 *    matching on the first characters.
 */
export function resolveLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  const candidate = logoUrl.trim();
  if (!candidate) return null;

  if (candidate.startsWith('/')) {
    let resolved: URL;
    try {
      resolved = new URL(candidate, RELATIVE_BASE);
    } catch {
      return null;
    }
    // `//evil.example/x` and `/\evil.example/x` both leave our origin here.
    return resolved.origin === RELATIVE_BASE ? candidate : null;
  }

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  return isCspAllowedImageHost(url.hostname) ? url.toString() : null;
}

/**
 * Apply link for this partner. `ref` is what `/api/apply/signup` resolves
 * against `Partner.referralCode`/`slug`; carrying it in the URL is the
 * primary attribution path (the middleware cookie only fires on top-level
 * navigations, so it can't be the only one).
 */
export function buildApplyHref(
  partner: Pick<EnrollmentPagePartner, 'referralCode' | 'slug'>,
  programSlug?: string
): string {
  const params = new URLSearchParams();
  params.set('ref', partner.referralCode);
  if (programSlug) params.set('program', programSlug);
  params.set('src', ENROLL_UTM.src);
  params.set('utm_source', ENROLL_UTM.utm_source);
  params.set('utm_medium', ENROLL_UTM.utm_medium);
  params.set('utm_campaign', partner.slug);
  return `/apply?${params.toString()}`;
}

/** Headline fallback when the partner row has no `enrollmentHeadline`. */
export function fallbackHeadline(partnerName: string): string {
  return `${partnerName} students: launch your career with an industry certification`;
}

/** Blurb fallback when the partner row has no `enrollmentBlurb`. Makes no cost claim. */
export function fallbackBlurb(partnerName: string): string {
  return `Pick an industry-recognized certificate track, apply in about 10 minutes, and train at your own pace around your ${partnerName} schedule.`;
}

export type PartnerEnrollmentViewProps = {
  partner: EnrollmentPagePartner;
  cards: EnrollmentProgramCard[];
  sponsorship: EnrollmentSponsorship | null;
};

export default function PartnerEnrollmentView({
  partner,
  cards,
  sponsorship,
}: PartnerEnrollmentViewProps) {
  const accent = resolveAccentColor(partner.brandColor);
  const logo = resolveLogoUrl(partner.logoUrl);
  const genericApplyHref = buildApplyHref(partner);
  const termSuffix = sponsorship?.termLabel ? ` for ${sponsorship.termLabel}` : '';
  const costLine = sponsorship ? sponsorship.message : NO_SPONSORSHIP_GUIDANCE;

  const steps = [
    {
      num: '1',
      title: 'Review the programs',
      desc: 'Browse the certificate tracks below and pick the one that fits your interests.',
    },
    {
      num: '2',
      title: 'Apply in about 10 minutes',
      desc: 'One short online application. No payment information is ever requested.',
    },
    {
      num: '3',
      title: 'Your spot is confirmed',
      desc: `${partner.name} and WorkforceAP confirm your spot and set up your training account.`,
    },
    {
      num: '4',
      title: 'Start training',
      desc: 'Self-paced and flexible — built to fit around your class schedule and activities.',
    },
  ];

  const faqs: { q: string; a: string; link?: { href: string; label: string } }[] = [
    {
      q: 'What does it cost?',
      a: `${costLine} Students and families are never asked for payment information.`,
    },
    {
      q: "I'm under 18 — can I apply?",
      a: `Yes — apply now. ${partner.name} collects a parent/guardian consent form before your training is activated.`,
    },
    {
      q: 'The application asks about income and employment — why?',
      a: `Those questions support other funding programs and do not affect ${partner.name} students — answer honestly and continue.`,
    },
    {
      q: 'How long does a program take?',
      a: 'Every program is self-paced and flexible — built to fit around your school schedule. Typical durations are shown on each program card above.',
    },
    {
      q: 'Questions?',
      a: `Talk to your ${partner.name} counselor, or reach the WorkforceAP team any time through our contact page.`,
      link: { href: '/contact', label: 'Visit /contact' },
    },
  ];

  return (
    <div
      className="mdx pen"
      style={accent ? ({ '--pen-accent': accent } as CSSProperties) : undefined}
    >
      {/* Belt-and-braces attribution: every CTA below already carries ?ref=,
          and middleware plants the durable cookie on document navigations.
          This covers the third path — a client-side navigation into this
          route, which middleware deliberately ignores. */}
      <Suspense fallback={null}>
        <ApplyRefCapture fallbackRef={partner.referralCode} />
      </Suspense>

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="pen-hero">
        <div className="pen-wrap pen-hero-grid">
          <div>
            <div className="pen-brandbar">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- partner-supplied URL from the DB; not a build-time asset next/image can size.
                <img className="pen-logo" src={logo} alt={`${partner.name} logo`} />
              ) : null}
              <span className="mdx-pill">{partner.name} Partnership</span>
            </div>

            <h1 className="pen-h1">
              {partner.enrollmentHeadline?.trim() ? (
                partner.enrollmentHeadline.trim()
              ) : (
                <>
                  {partner.name} students: launch your career with an{' '}
                  <span className="pen-shimmer">industry certification</span>
                </>
              )}
            </h1>

            <p className="pen-sub">
              {partner.enrollmentBlurb?.trim() || fallbackBlurb(partner.name)}
            </p>

            {/* No remaining-seat counter here. It is a live scarcity claim on
                a page aimed at minors and their families, it was never on the
                page this replaced, and the loader deliberately no longer
                returns the number. */}
            <p className="pen-cost">{costLine}</p>

            <div className="pen-acts">
              <a className="mdx-btn mdx-btn--solid" href={genericApplyHref}>
                Start your application <span aria-hidden="true">→</span>
              </a>
              <a className="mdx-btn mdx-btn--glass" href="#pen-programs">
                See the programs
              </a>
            </div>

            <p className="pen-meta-note">
              About 10 minutes to apply • No payment information requested
            </p>
          </div>

          <aside className="pen-glass">
            <div className="pen-glass-tag">WorkforceAP × {partner.name}</div>
            <div className="pen-glass-meter">
              <span>Certificate programs for {partner.name} students</span>
              <strong>{cards.length}</strong>
            </div>
            <div className="pen-glass-rows">
              <div className="pen-glass-row">Industry-recognized certifications</div>
              <div className="pen-glass-row">Self-paced and flexible</div>
              <div className="pen-glass-row">
                {sponsorship
                  ? `Sponsored enrollment${termSuffix}`
                  : 'Counselor-guided program selection'}
              </div>
            </div>
            <div className="pen-glass-chips">
              <span>{sponsorship ? 'Sponsored partnership' : 'Partner school'}</span>
              {sponsorship?.termLabel ? <span>{sponsorship.termLabel} program year</span> : null}
              {partner.schoolDistrict ? <span>{partner.schoolDistrict}</span> : null}
            </div>
          </aside>
        </div>
      </section>

      {/* ──────────────────── HOW IT WORKS ──────────────────── */}
      <section className="pen-band">
        <div className="pen-wrap">
          <div className="pen-sechead">
            <span className="mdx-eyebrow">How it works</span>
            <h2>Four steps from here to certified</h2>
            <p>
              Your school and WorkforceAP handle the paperwork — you focus on the training.
            </p>
          </div>
          <div className="pen-steps">
            {steps.map((step) => (
              <div key={step.num} className="mdx-card pen-step">
                <div className="pen-step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── PROGRAM CARDS ───────────────────── */}
      <section className="pen-band pen-band--surface" id="pen-programs">
        <div className="pen-wrap">
          <div className="pen-sechead">
            <span className="mdx-eyebrow">Your programs</span>
            <h2>Certificate tracks picked for {partner.name}</h2>
            <p>
              Every track is self-paced and flexible — built to fit around your school schedule —
              and ends in an industry-recognized certificate. {costLine}
            </p>
          </div>
          <div className="pen-grid">
            {cards.map((card) => (
              <article key={card.slug} className="mdx-card pen-card">
                <div className="pen-card-top">
                  <span
                    className="pen-cat-pill"
                    style={{ background: resolveCategoryPillColor(card.categoryColor) }}
                  >
                    {card.categoryLabel}
                  </span>
                  {/* Only a sponsorship badge, never the program's generic
                      "WIOA/Grant" funding pill. High-school students are
                      generally not WIOA-eligible, so on a school page that pill
                      reads as a funding claim about THEM. With no sponsorship
                      in force we show no funding badge at all. */}
                  {sponsorship ? (
                    <span className="pen-fund-pill">{`Sponsored${termSuffix}`}</span>
                  ) : null}
                  {card.featured ? <span className="pen-featured-pill">Recommended</span> : null}
                </div>

                <h3>{card.title}</h3>

                <div className="pen-card-meta">
                  <span>{card.duration}</span>
                  <span>
                    Starting range: <b>{card.salaryRange}</b>
                  </span>
                </div>
                <p className="pen-disclaimer">{SALARY_RANGE_DISCLAIMER}</p>

                {card.note ? <p className="pen-note">{card.note}</p> : null}

                <div className="pen-skills">
                  {card.skills.map((skill) => (
                    <span key={skill} className="pen-skill">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="pen-card-foot">
                  <span className="pen-card-partner">Partner: {card.partner}</span>
                  <div className="pen-card-acts">
                    <a className="mdx-btn mdx-btn--ghost" href={`/programs/${card.slug}`}>
                      View Program
                    </a>
                    <a
                      className="mdx-btn mdx-btn--primary"
                      href={buildApplyHref(partner, card.slug)}
                    >
                      Get Started <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section className="pen-band">
        <div className="pen-wrap">
          <div className="pen-sechead">
            <span className="mdx-eyebrow">Good to know</span>
            <h2>Questions students and families ask</h2>
          </div>
          <div className="pen-faq">
            {faqs.map((faq) => (
              <details key={faq.q} className="pen-faq-item">
                <summary>{faq.q}</summary>
                <p className="pen-faq-answer">
                  {faq.a}
                  {faq.link ? (
                    <>
                      {' '}
                      <a href={faq.link.href}>{faq.link.label}</a>
                    </>
                  ) : null}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── CLOSING CTA ───────────────────── */}
      <section className="pen-close">
        <div className="pen-wrap">
          <span className="mdx-pill">WorkforceAP × {partner.name}</span>
          <h2>Your certification starts here</h2>
          <p>{costLine} Apply in about 10 minutes.</p>
          <div className="pen-acts">
            <a className="mdx-btn mdx-btn--solid" href={genericApplyHref}>
              Start your application <span aria-hidden="true">→</span>
            </a>
            <a className="mdx-btn mdx-btn--glass" href="#pen-programs">
              See the programs
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
