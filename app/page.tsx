import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLinkServer from '@/components/LocalizedLinkServer';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { DynamicFooter, DynamicMobileBottomNav } from '@/components/marketing/dynamicMarketingChrome';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import TrustStrip from '@/components/marketing/TrustStrip';

import { getTranslations } from 'next-intl/server';
import { marketingButtonPresets, marketingButtonClasses } from '@/lib/marketing/buttonClasses';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

const HomePageBelowFold = dynamic(() => import('@/components/marketing/HomePageBelowFold'));

// Product stake: lead with a plain-English member promise; keep the brand line
// "Empowering People. Advancing Futures." visible but secondary, with concrete next steps below.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.home');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/',
  });
}

const HERO_IMAGE_SRC = '/images/hero-people.webp';

const HOMEPAGE_PROGRAM_ORDER = [
  'digital-literacy-empowerment-class',
  'it-support-professional-certificate-ibm',
  'ai-professional-developer-certificate-ibm',
  'project-management-professional-certificate-microsoft',
] as const;

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
          boxSizing: 'border-box',
        }}
        >
          <p
            className="text-label-upper"
            style={{
              color: 'var(--home-hero-fg-muted, rgba(242, 242, 245, 0.72))',
              marginBottom: '0.75rem',
              letterSpacing: '0.14em',
              fontSize: 'clamp(0.625rem, 0.35vw + 0.58rem, 0.75rem)',
            }}
          >
            {t('heroBrandLine')}
          </p>

          <h1
            className="text-display-lg"
            style={{
              color: 'var(--home-hero-fg, #f2f2f5)',
              marginBottom: '1.5rem',
              lineHeight: 1.05,
              fontSize: 'clamp(1.5rem, 4vw + 0.5rem, 4.5rem)',
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

            {/* Mobile-only primary CTA pill (≥44px tap target, ≥1.05rem font, accent fill, white text).
                Hidden on desktop via CSS — the canonical primary CTA below the step pills covers that. */}
            <LocalizedLinkServer
              href="/apply"
              className={marketingButtonClasses({
                variant: 'primary',
                radius: 'lg',
                large: true,
                className: 'home-hero__mobile-primary-cta',
              })}
            >
              {t('heroMobilePrimaryCta')}
            </LocalizedLinkServer>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', maxWidth: '720px' }}>
            {([t('heroStep1'), t('heroStep2'), t('heroStep3')] as const).map((step, index) => (
              <div
                key={index}
                className={marketingButtonPresets.heroStepCapsuleOnDark('marketing-hero-step-pill')}
              >
                <span className={marketingButtonPresets.stepNumPill('marketing-hero-step-pill__index')}>
                  {index + 1}
                </span>
                <span className="marketing-hero-step-pill__label">{step}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <LocalizedLinkServer
              href="/apply"
              className={marketingButtonPresets.heroPrimary('home-hero__cta-primary')}
            >
              {t('heroCtaPrimary')}
            </LocalizedLinkServer>
            <LocalizedLinkServer
              href="/find-your-path"
              className={marketingButtonPresets.heroSecondaryOnDark('home-hero__cta-secondary home-hero-secondary-cta')}
            >
              {t('heroCta')}
            </LocalizedLinkServer>
            <LocalizedLinkServer
              href="/programs"
              className={marketingButtonPresets.heroGhostOnDark('home-hero__cta-ghost')}
            >
              {t('browsePrograms')}
            </LocalizedLinkServer>
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
            {/* Mobile-only apply link — shown when the outline CTA button is hidden */}
            <p className="home-hero-mobile-apply" style={{ margin: 0 }}>
              <LocalizedLinkServer href="/apply" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--home-hero-fg-muted, rgba(242,242,245,0.82))', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                {t('readyToApply')}
              </LocalizedLinkServer>
            </p>
          </div>

          <div
            className="home-hero__trust-cards"
            style={{
            marginTop: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: '0.875rem',
            maxWidth: '980px',
          }}
          >
            {([
              { icon: 'group', title: t('trustReviewed'), desc: t('trustReviewedDetail') },
              { icon: 'verified_user', title: t('trustYears'), desc: t('trustYearsDetail') },
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

      <TrustStrip variant="home" />

      <HomePageBelowFold homeProgramShowcase={homeProgramShowcase} programCount={programCount} />

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
