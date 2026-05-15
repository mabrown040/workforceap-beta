import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE, FUNDING_SOURCES, FUNDING_COLORS } from '@/lib/content/programs';
import { MARKETING_JOURNEY_STEPS, type MarketingJourneyStep } from '@/lib/content/marketingJourneySteps';
import { DynamicFooter, DynamicMobileBottomNav } from '@/components/marketing/dynamicMarketingChrome';
import ErrorBoundary from '@/components/error/ErrorBoundary';

import { getTranslations } from 'next-intl/server';
import { marketingButtonClasses, marketingNumPillClasses } from '@/lib/marketing/buttonClasses';
import LanguageToggle from '@/components/portal/LanguageToggle';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

// Product stake: if the homepage uses the brand line "Empowering People. Advancing Futures.",
// keep the supporting copy immediately concrete, member-safe, and operational.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.home');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/',
  });
}

const HERO_IMAGE_SRC = '/images/hero-people.webp';
const HOMEPAGE_PROGRAM_CARD_IMAGES = {
  community: '/images/austin-skyline.webp',
  technology: '/images/hero-people.webp',
  handsOn: '/images/AdobeStock_78118914.webp',
} as const;

const HOMEPAGE_PROGRAM_ORDER = [
  'digital-literacy-empowerment-class',
  'it-support-professional-certificate-ibm',
  'ai-professional-developer-certificate-ibm',
  'project-management-professional-certificate-microsoft',
] as const;

function getHomepageProgramCardImage(
  program: { slug: string; category?: string | null; name?: string | null; static?: { categoryLabel?: string | null; title?: string | null } | null },
  index: number,
) {
  // Ensure we don't repeat the same image 4 times on the homepage
  const images = [
    '/images/AdobeStock_78118914.webp',
    '/images/austin-skyline.webp',
    '/images/hero-people.webp',
    '/images/image-asset.webp'
  ];
  return images[index % images.length];
}

const HERO_IMAGE_BLUR =
  'data:image/jpeg;base64,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';

export default async function HomePage() {
  const t = await getTranslations('marketing.home');
  let activePrograms: Awaited<ReturnType<typeof getActivePrograms>> = [];
  try {
    activePrograms = await getActivePrograms();
  } catch (e) {
    console.error('[homepage] getActivePrograms failed', e);
    activePrograms = [];
  }
  const preferredOrderIndex = (slug: string | null | undefined) => {
    if (!slug) return Number.MAX_SAFE_INTEGER;
    const index = HOMEPAGE_PROGRAM_ORDER.indexOf(slug as (typeof HOMEPAGE_PROGRAM_ORDER)[number]);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const sortHomepagePrograms = <T extends { slug: string; displayOrder?: number | null }>(programs: T[]) =>
    [...programs].sort((a, b) => {
      const preferredDiff = preferredOrderIndex(a.slug) - preferredOrderIndex(b.slug);
      if (preferredDiff !== 0) return preferredDiff;

      const aDisplay = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bDisplay = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (aDisplay !== bDisplay) return aDisplay - bDisplay;

      return a.slug.localeCompare(b.slug);
    });

  const featured = activePrograms.filter((p) => p.featured);
  const homeProgramShowcase =
    activePrograms.length > 0
      ? sortHomepagePrograms(featured.length ? featured : activePrograms).slice(0, 4)
      : sortHomepagePrograms(
          PROGRAMS.map((p, i) => ({
            slug: p.slug,
            name: p.title,
            description: null,
            category: p.categoryLabel,
            deliveryType: 'internal',
            deliveryUrl: null,
            deliveryDetails: null,
            certifications: [],
            duration: p.duration,
            status: 'active',
            displayOrder: i,
            featured: false,
            static: p,
          }))
        )
        .slice(0, 4);
  // Always display the canonical catalog size so the headline count matches
  // /programs, /salary-guide, /blog. The DB-driven activePrograms count is
  // only used to pick which 4 cards to feature in the showcase below.
  const programCount = WORKFORCEAP_PROGRAM_CATALOG_SIZE;

  const journeyPhaseLabel = (phase: MarketingJourneyStep['homePhase']) => {
    if (phase === 1) return t('journeyPhaseGetStarted');
    if (phase === 2) return t('journeyPhaseTrain');
    return t('journeyPhaseLaunch');
  };

  return (
    <div className="homepage" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>

      {/* ===== HERO: Full-bleed background image with gradient overlay (all viewports) ===== */}
      <section className="home-hero" style={{
        position: 'relative',
        minHeight: 'min(85vh, 820px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Background image */}
        <Image
          src={HERO_IMAGE_SRC}
          alt="Collaborative workspace"
          fill
          priority={true}
          fetchPriority="high"
          sizes={MARKETING_FULL_BLEED_HERO_SIZES}
          quality={85}
          placeholder="blur"
          blurDataURL={HERO_IMAGE_BLUR}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          /* Hardcode bottom to #121416 to ensure contrast against white text */
          background: 'linear-gradient(180deg, rgba(28,31,36,0.52) 0%, rgba(28,31,36,0.78) 55%, #121416 100%)',
          zIndex: 1,
        }} />

        <div
          className="home-hero__inner"
          style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1400px',
          width: '100%',
          padding: 'clamp(5.5rem, 12vw, 8rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 8vw, 6rem)',
        }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
            <LanguageToggle compact />
          </div>

          <h1
            className="text-display-lg"
            style={{
              color: 'var(--home-hero-fg, #f2f2f5)',
              marginBottom: '1.5rem',
              lineHeight: 1.05,
              fontSize: 'clamp(2.25rem, 6vw + 1rem, 4.5rem)',
            }}
          >
            {t('heroTagline')}{' '}
            <span style={{ color: 'var(--color-accent)' }}>{t('heroTaglineAccent')}</span>
          </h1>

          <div style={{ maxWidth: '980px', display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1rem' }}>
            <p style={{
              fontSize: 'clamp(1rem, 0.5vw + 0.95rem, 1.22rem)',
              color: 'var(--home-hero-fg-muted, rgba(242, 242, 245, 0.88))',
              lineHeight: 1.7,
              margin: 0,
            }}>
              {t('heroBody1')}
            </p>

            <p style={{
              fontSize: 'clamp(0.98rem, 0.45vw + 0.92rem, 1.12rem)',
              color: 'var(--home-hero-fg-muted, rgba(242, 242, 245, 0.82))',
              lineHeight: 1.65,
              margin: 0,
            }}>
              {t('heroBody2')}
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', maxWidth: '720px' }}>
            {([t('heroStep1'), t('heroStep2'), t('heroStep3')] as const).map((step, index) => (
              <div
                key={index}
                className={marketingButtonClasses({
                  variant: 'secondary',
                  radius: 'full',
                  onDarkSecondary: true,
                  className: 'marketing-hero-step-pill',
                })}
              >
                <span className={marketingNumPillClasses({ className: 'marketing-hero-step-pill__index' })}>
                  {index + 1}
                </span>
                <span className="marketing-hero-step-pill__label">{step}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <LocalizedLink
              href="/apply"
              className={marketingButtonClasses({
                variant: 'primary',
                radius: 'lg',
                large: true,
                className: 'home-hero__cta-primary',
              })}
            >
              {t('heroCtaPrimary')}
            </LocalizedLink>
            <LocalizedLink
              href="/find-your-path"
              className={marketingButtonClasses({
                variant: 'secondary',
                radius: 'lg',
                large: true,
                onDarkSecondary: true,
                className: 'home-hero__cta-secondary home-hero-secondary-cta',
              })}
            >
              {t('heroCta')}
            </LocalizedLink>
            <LocalizedLink
              href="/programs"
              className={marketingButtonClasses({
                variant: 'ghost',
                radius: 'md',
                large: true,
                className: 'home-hero__cta-ghost',
              })}
            >
              {t('browsePrograms')}
            </LocalizedLink>
          </div>
          <p style={{ marginTop: '0.65rem', marginBottom: 0, fontSize: 'clamp(0.95rem, 0.5vw + 0.88rem, 1.05rem)', fontWeight: 600, color: 'var(--home-hero-fg-muted, rgba(242,242,245,0.92))' }}>
            {t('heroSocialProof')}
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--home-hero-fg-muted, rgba(242,242,245,0.7))', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: 0 }}>
              <span>✓ {t('trustGrant')}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>✓ {t('trustNoCard')}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>✓ {t('trustNoCost')}</span>
            </p>
            {/* Funding source chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
              {FUNDING_SOURCES.map((fs) => {
                const c = FUNDING_COLORS[fs];
                return (
                  <span
                    key={fs}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '50px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      background: c.bg,
                      color: c.text,
                      border: `1px solid ${c.border}`,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.75rem' }} aria-hidden="true">account_balance</span>
                    {fs}
                  </span>
                );
              })}
            </div>
            {/* Mobile-only apply link — shown when the outline CTA button is hidden */}
            <p className="home-hero-mobile-apply" style={{ margin: 0 }}>
              <LocalizedLink href="/apply" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--home-hero-fg-muted, rgba(242,242,245,0.82))', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {t('readyToApply')}
              </LocalizedLink>
            </p>
          </div>

          <div style={{
            marginTop: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '0.875rem',
            maxWidth: '980px',
          }}>
            {([
              { icon: 'group', title: t('trustReviewed'), desc: t('trustReviewedDetail') },
              { icon: 'verified_user', title: t('trustYears'), desc: t('trustYearsDetail') },
              { icon: 'work', title: t('trustEmployer'), desc: t('trustEmployerDetail') },
            ] as const).map((item) => (
              <div
                key={item.title}
                style={{
                  background: 'rgba(15, 18, 24, 0.52)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1rem',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: '1.125rem' }} aria-hidden="true">
                    {item.icon}
                  </span>
                  <p style={{ margin: 0, color: 'var(--home-hero-fg, #f2f2f5)', fontWeight: 700, fontSize: '0.95rem' }}>{item.title}</p>
                </div>
                <p style={{ margin: 0, color: 'var(--home-hero-fg-muted, rgba(242, 242, 245, 0.82))', lineHeight: 1.6, fontSize: '0.875rem' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Competitor contrast — factual positioning (below hero) ===== */}
      <section className="home-contrast" aria-labelledby="home-contrast-heading" style={{
        background: 'var(--surface-container-low)',
        padding: 'clamp(1.75rem, 4vw, 2.75rem) 0',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <h2 id="home-contrast-heading" className="text-label-upper" style={{
            textAlign: 'center',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1.25rem',
            letterSpacing: '0.12em',
            fontSize: '0.625rem',
          }}>
            {t('contrastEyebrow')}
          </h2>
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
            gap: '0.75rem',
          }}>
            {([
              { key: 'contrast1' as const, icon: 'work_outline' as const },
              { key: 'contrast2' as const, icon: 'account_balance' as const },
              { key: 'contrast3' as const, icon: 'schedule' as const },
            ]).map((row) => (
              <li key={row.key}>
                <div className="portal-card portal-card--flat" style={{
                  background: 'var(--surface-container-lowest)',
                  padding: '1rem 1.1rem',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}>
                  <span className="material-symbols-outlined" style={{
                    fontSize: '1.25rem',
                    color: 'var(--color-accent)',
                    flexShrink: 0,
                    marginTop: '0.05rem',
                  }} aria-hidden="true">
                    {row.icon}
                  </span>
                  <p style={{
                    margin: 0,
                    fontSize: 'clamp(0.875rem, 0.35vw + 0.82rem, 0.95rem)',
                    lineHeight: 1.55,
                    color: 'var(--color-on-surface)',
                    fontWeight: 600,
                  }}>
                    {t(row.key)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Social Proof / Credibility Bar ===== */}
      <section className="home-credibility-bar" aria-label="Partner logos" style={{ padding: '2rem 0', background: 'var(--surface-container-lowest)' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <p className="text-label-upper" style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', opacity: 0.7, marginBottom: '1.5rem', fontSize: '0.625rem', letterSpacing: '0.2em' }}>
            {t('credBarLabel')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '3rem', opacity: 0.65 }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Google</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>AT&T</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Coursera</span>
            <Image className="home-cred-logo" src="/images/microsoft-logo.svg" alt="Microsoft" width={100} height={24} loading="lazy" />
            <Image className="home-cred-logo" src="/images/ibm-logo.svg" alt="IBM" width={60} height={24} loading="lazy" />
          </div>
        </div>
      </section>

      {/* ===== A Network Built for Success — Stakeholder Cards (Partnerships) ===== */}
      <section aria-label="Partnerships" style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
              {t('partnershipsEyebrow')}
            </span>
            <h2 className="text-display-sm">{t('networkTitle')}</h2>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '2rem',
            alignItems: 'start',
          }}>
            {/* For Members — first + elevated (primary audience) */}
            <div className="portal-card portal-card--flat home-employer-elevated" style={{
              background: 'var(--surface-container-lowest)', padding: '2rem',
              border: '2px solid var(--color-accent)',
              transform: 'translateY(-1rem)',
              boxShadow: '0 8px 32px rgba(173,44,77,0.15)',
            }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(173,44,77,0.2)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">person</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{t('memberCardTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  {t('memberCardNoCost')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  {WORKFORCEAP_PROGRAM_CATALOG_SIZE} {t('statTracks')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  {t('memberCardResume')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-accent)' }} aria-hidden="true">check_circle</span>
                  {t('memberCardJobs')}
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                <LocalizedLink href="/apply" className="btn btn-primary btn-small">{t('memberCardCta')}</LocalizedLink>
                <LocalizedLink href="/wioa-qualification" className="btn btn-secondary btn-small">{t('memberCardCta2')}</LocalizedLink>
              </div>
            </div>

            {/* For Partners */}
            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div style={{ width: '3rem', height: '3rem', background: 'rgba(43,123,185,0.12)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-blue, #2b7bb9)', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">handshake</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{t('partnerCardTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-blue, #2b7bb9)' }} aria-hidden="true">check_circle</span>
                  {t('partnerCardSharing')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-blue, #2b7bb9)' }} aria-hidden="true">check_circle</span>
                  {t('partnerCardRefer')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-blue, #2b7bb9)' }} aria-hidden="true">check_circle</span>
                  {t('partnerCardImpact')}
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <LocalizedLink href="/partners" className="btn btn-primary btn-small">{t('partnerCardCta')}</LocalizedLink>
              </div>
            </div>

            {/* For Employers */}
            <div className="portal-card portal-card--flat" style={{ background: 'var(--surface-container-lowest)', padding: '2rem' }}>
              <div className="marketing-chip-text--gold" style={{ width: '3rem', height: '3rem', background: 'rgba(255,187,0,0.165)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <span className="material-symbols-outlined" aria-hidden="true">business</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>{t('employerCardTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1rem' }} aria-hidden="true">check_circle</span>
                  {t('employerCardCandidates')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1rem' }} aria-hidden="true">check_circle</span>
                  {t('employerCardTraining')}
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  <span className="material-symbols-outlined marketing-chip-text--gold" style={{ fontSize: '1rem' }} aria-hidden="true">check_circle</span>
                  {t('employerCardGrads')}
                </li>
              </ul>
              <div style={{ marginTop: '1.5rem' }}>
                <LocalizedLink href="/employers" className="btn btn-primary btn-small">{t('employerCardCta')}</LocalizedLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Built on Workforce Experience — Bento: 2/3 text + 1/3 stats grid ===== */}
      <section aria-label="Impact statistics" style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div id="impact" className="home-impact-bento">
          {/* Text block (2/3) */}
          <div>
            <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}>
              {t('aboutEyebrow')}
            </span>
            <h2 className="text-display-sm" style={{ marginBottom: '1.5rem' }}>
              {t('aboutTitle')}
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem', maxWidth: '680px' }}>
              {t('aboutBody1')}
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, maxWidth: '680px' }}>
              {t('aboutBody2')}
            </p>
          </div>

          {/* Stats grid (1/3) */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem',
          }}>
            <div className="portal-card portal-card--flat" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span className="marketing-chip-text--gold" style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>2,000+</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('statLearners')}</span>
            </div>
            <div className="portal-card portal-card--flat" style={{
              background: 'var(--surface-container-high)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1 }}>{programCount}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('statPrograms')}</span>
            </div>
            {/* Accent card spanning full width */}
            <div className="portal-card portal-card--flat" style={{
              gridColumn: '1 / -1',
              background: 'var(--color-accent)', color: 'white', padding: '1.5rem',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1 }}>$0</span>
              <span style={{ display: 'block', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.9 }}>{t('statMemberCost')}</span>
              <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '0.35rem', opacity: 0.75, fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>For qualifying members</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Milestone Journey — Horizontal Scrolling Cards ===== */}
      <section aria-label="Career journey" style={{ background: 'var(--surface-container-low)', padding: 'clamp(3rem, 6vw, 6rem) 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 2rem)' }}>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem', textAlign: 'center' }}>{t('journeyTitle')}</h2>
          <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
            {t('journeySubtitle')}
          </p>
          <p style={{
            textAlign: 'center',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--color-accent)',
            marginBottom: '0.75rem',
            letterSpacing: '0.02em',
          }}>
            {t('journeyPhasesRibbon')}
          </p>
          <p style={{
            textAlign: 'center',
            color: 'var(--color-on-surface)',
            marginBottom: '2.5rem',
            maxWidth: '520px',
            marginLeft: 'auto',
            marginRight: 'auto',
            fontWeight: 600,
            lineHeight: 1.55,
          }}>
            {t('journeySupportLine')}
          </p>
        </div>
        <div style={{
          display: 'flex',
          gap: '1.25rem',
          overflowX: 'auto',
          padding: `0 clamp(1rem, 4vw, 2rem) 1.5rem`,
          paddingRight: 'max(clamp(1rem, 4vw, 2rem), env(safe-area-inset-right, 0px))',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}>
          {MARKETING_JOURNEY_STEPS.map((step) => (
            <div key={step.num} className="home-milestone-card" style={{
              flex: '0 0 260px', scrollSnapAlign: 'start',
              background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.02em' }}>{journeyPhaseLabel(step.homePhase)}</span>
                <h3 style={{ fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '1.125rem' }}>{step.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{step.shortDesc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <LocalizedLink href="/how-it-works" className="btn btn-secondary">{t('journeyCta')}</LocalizedLink>
        </div>
      </section>

      {/* ===== Available Programs — prioritized homepage cards with images, category labels, duration + cert badges ===== */}
      <section aria-label="Available programs" style={{ padding: 'clamp(3rem, 6vw, 6rem) clamp(1rem, 4vw, 2rem)', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
            {t('programsEyebrow')}
          </span>
          <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>{t('programsTitle', { count: programCount })}</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', maxWidth: '600px' }}>
            {t('programsSubtitle')}
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1.5rem' }}>
          {homeProgramShowcase.map((p, index) => (
            <LocalizedLink
              key={p.slug}
              href={`/programs/${p.slug}`}
              className="portal-card portal-card--flat"
              style={{
                background: 'var(--surface-container-high)',
                color: 'var(--color-on-surface)',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              {/* Card image area */}
              <div style={{
                position: 'relative', height: '180px',
                background: 'var(--surface-container-highest)',
                overflow: 'hidden',
              }}>
                <Image
                  src={getHomepageProgramCardImage(p, index)}
                  alt={p.static?.title ?? p.name}
                  fill
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  style={{ objectFit: 'cover', opacity: 0.7 }}
                />
                {/* Category label */}
                <span style={{
                  position: 'absolute', top: '0.75rem', left: '0.75rem',
                  padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full, 50px)',
                  background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                  color: 'white', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{p.category}</span>
              </div>
              <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 }}>{p.static?.title ?? p.name}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                  {/* Duration badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full, 50px)',
                    background: 'var(--surface-container-lowest)', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">schedule</span>
                    {p.duration ?? p.static?.duration ?? '3-5 months'}
                  </span>
                  {/* Cert badge */}
                  <span className="marketing-cert-badge">
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">verified</span>
                    {t('programsCertBadge')}
                  </span>
                </div>
              </div>
            </LocalizedLink>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <LocalizedLink href="/programs" className="btn btn-secondary">
            {t('programsCta', { count: programCount })}
          </LocalizedLink>
        </div>
      </section>

      {/* ===== AI-Powered Career Support ===== */}
      <section aria-label="AI career support" style={{ padding: 'clamp(3rem, 6vw, 5rem) clamp(1rem, 4vw, 2rem)', maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '0.75rem', display: 'inline-block' }}>
          {t('aiEyebrow')}
        </span>
        <h2 className="text-display-sm" style={{ marginBottom: '1rem' }}>
          {t('aiTitle')}
        </h2>
        <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          {t('aiCopy')}
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', opacity: 0.7, marginBottom: '2rem' }}>
          {t('aiVoice')}
        </p>
        <LocalizedLink href="/apply" className="btn btn-primary">
          {t('aiCta')}
        </LocalizedLink>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="footer-cta" aria-label="Get started" style={{ background: 'var(--color-accent)', padding: 'clamp(3rem, 6vw, 4rem) clamp(1rem, 4vw, 2rem)', textAlign: 'center' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.02em', color: 'white', marginBottom: '1rem' }}>{t('ctaTitle')}</h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: '2rem', fontSize: '1.125rem' }}>
            {t('ctaCopy')}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', alignItems: 'center' }}>
            <LocalizedLink href="/apply" className="btn btn-large" style={{ background: 'white', color: 'var(--color-accent)', fontWeight: 700 }}>
              {t('ctaApply')}
            </LocalizedLink>
            <LocalizedLink href="/find-your-path" className="btn btn-large" style={{ background: 'transparent', color: 'white', border: '2px solid white', fontWeight: 700 }}>
              {t('ctaFind')}
            </LocalizedLink>
            <LocalizedLink href="/programs" className="btn btn-large" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.55)', fontWeight: 600 }}>
              {t('ctaViewPrograms')}
            </LocalizedLink>
          </div>
        </div>
      </section>

      <ErrorBoundary
        fallback={
          <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
            <p>Footer could not load.</p>
          </footer>
        }
      >
        <DynamicMobileBottomNav />
      </ErrorBoundary>
      <ErrorBoundary
        fallback={
          <footer style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
            <p>Footer could not load.</p>
          </footer>
        }
      >
        <DynamicFooter variant="home" />
      </ErrorBoundary>
    </div>
  );
}
