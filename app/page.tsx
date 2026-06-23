import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLinkServer from '@/components/LocalizedLinkServer';
import Image from 'next/image';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import { PROGRAMS, WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { DynamicFooter, DynamicMobileBottomNav } from '@/components/marketing/dynamicMarketingChrome';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import LanguageToggle from '@/components/portal/LanguageToggle';

import { getTranslations } from 'next-intl/server';
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
    <div className="wa-v3">

      {/* ===== BENTO HERO: real next/image photo layered behind crimson→plum gradient ===== */}
      <header className="wa-hero">
        <div className="wa-wrap">
          <div className="wa-bento">
            <div className="wa-tile wa-tile--hero">
              {/* Real hero photo via next/image (kept as <Image>, not a CSS bg) */}
              <div className="wa-hero-photo" aria-hidden="true">
                <Image
                  src={HERO_IMAGE_SRC}
                  alt=""
                  fill
                  priority={true}
                  fetchPriority="high"
                  sizes={MARKETING_FULL_BLEED_HERO_SIZES}
                  quality={85}
                  placeholder="blur"
                  blurDataURL={HERO_IMAGE_BLUR}
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>

              <span className="wa-ribbon">{t('memberPromiseEyebrow')}</span>
              <h1>
                {t('heroTagline')}
                <br />
                <span className="wa-accent">{t('heroTaglineAccent')}</span>
              </h1>
              <p>{t('heroBody1')}</p>

              <div className="wa-hero-actions">
                <LocalizedLinkServer href="/apply" className="wa-btn wa-btn--light">
                  {t('heroMobilePrimaryCta')}
                </LocalizedLinkServer>
                <LocalizedLinkServer href="/programs#program-catalog" className="wa-btn wa-btn--translucent">
                  {t('browsePrograms')}
                </LocalizedLinkServer>
              </div>

              <div className="wa-chips">
                <span className="wa-chip">
                  <span className="wa-d" style={{ background: 'var(--wa-success)' }} aria-hidden="true" />
                  {t('trustNoCost')}
                </span>
                <span className="wa-chip">
                  <span className="wa-d" style={{ background: 'var(--wa-gold)' }} aria-hidden="true" />
                  {t('trustReviewed')}
                </span>
              </div>
            </div>

            <div className="wa-tile wa-tile--claim wa-tile--gold">
              <div className="wa-k">{t('memberCardCount')}</div>
              <div className="wa-s">{t('description')}</div>
            </div>

            <div className="wa-tile wa-tile--claim wa-tile--team">
              <div className="wa-av" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="wa-k">{t('trustReviewed')}</div>
              <div className="wa-s">{t('trustReviewedDetail')}</div>
            </div>
          </div>
        </div>
      </header>

      <HomePageBelowFold homeProgramShowcase={homeProgramShowcase} programCount={programCount} />

      <div className="wa-lang-row">
        <LanguageToggle compact />
      </div>

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
