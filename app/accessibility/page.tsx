import '@/css/marketing-v3-accessibility.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';
import { getTranslations } from 'next-intl/server';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

/**
 * Date this accessibility statement was last reviewed end-to-end (not just
 * edited). Bump when the known-exceptions list, target conformance level,
 * or reporting channel changes.
 */
const ACCESSIBILITY_LAST_REVIEWED_AT = '2026-05-19';

const HERO_IMAGE_SRC = '/images/hero-people.webp';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.accessibility');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/accessibility',
  });
}

function formatLastReviewed(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const ShieldCheck = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M9 12l2 2 4-4" />
    <path d="M12 3l8 4v5c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7z" />
  </svg>
);

const Triangle = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 9v4M12 17h.01" />
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);

const Chat = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const Refresh = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export default async function AccessibilityPage() {
  const t = await getTranslations('marketing.accessibility');
  const lastReviewed = formatLastReviewed(ACCESSIBILITY_LAST_REVIEWED_AT);

  return (
    <div className="wa-v3 inner-page">
      {/* ===== PAGE HERO: statement header over crimson→plum gradient + photo ===== */}
      <header className="wa-a11y-hero">
        <div className="wa-a11y-hero-photo" aria-hidden="true">
          <Image
            src={HERO_IMAGE_SRC}
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes={MARKETING_FULL_BLEED_HERO_SIZES}
            quality={85}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
        <div className="wa-wrap">
          <span className="wa-eyebrow">{t('eyebrow')}</span>
          <h1>{t('heading')}</h1>
          <p>{t('intro')}</p>
          <p className="wa-reviewed">
            {t('lastReviewedLabel')}: {lastReviewed}
          </p>
        </div>
      </header>

      {/* ===== CONTENT: stacked statement cards ===== */}
      <section className="wa-a11y-content">
        <div className="wa-wrap">
          <div className="wa-a11y-stack">
            {/* Conformance commitment */}
            <article className="wa-a11y-card">
              <div className="wa-a11y-card-head">
                <span className="wa-ic wa-ic--info">
                  <ShieldCheck />
                </span>
                <h2>{t('commitmentTitle')}</h2>
              </div>
              <p>{t('commitmentCopy1')}</p>
              <p>{t('commitmentCopy2')}</p>
            </article>

            {/* Known exceptions */}
            <article className="wa-a11y-card">
              <div className="wa-a11y-card-head">
                <span className="wa-ic wa-ic--gold">
                  <Triangle />
                </span>
                <h2>{t('exceptionsTitle')}</h2>
              </div>
              <p>{t('exceptionsCopy')}</p>
              <ul>
                <li>{t('exception1')}</li>
                <li>{t('exception2')}</li>
                <li>{t('exception3')}</li>
              </ul>
            </article>

            {/* Help */}
            <article className="wa-a11y-card">
              <div className="wa-a11y-card-head">
                <span className="wa-ic wa-ic--accent">
                  <Chat />
                </span>
                <h2>{t('helpTitle')}</h2>
              </div>
              <p>{t('helpCopy')}</p>
              <ul className="wa-a11y-contact">
                <li>
                  <span className="wa-lab">{t('helpEmail')}</span>{' '}
                  <a href="mailto:info@workforceap.org">info@workforceap.org</a>
                </li>
                <li>
                  <span className="wa-lab">{t('helpPhone')}</span>{' '}
                  <a href="tel:+15127771808">(512) 777-1808</a>
                </li>
                <li>
                  <span className="wa-lab" style={{ minWidth: 0 }} aria-hidden="true" />{' '}
                  <LocalizedLink href="/contact?topic=accessibility">{t('helpForm')}</LocalizedLink>
                </li>
              </ul>
            </article>

            {/* Ongoing improvements */}
            <article className="wa-a11y-card">
              <div className="wa-a11y-card-head">
                <span className="wa-ic wa-ic--success">
                  <Refresh />
                </span>
                <h2>{t('improvementsTitle')}</h2>
              </div>
              <p>{t('improvementsCopy1')}</p>
              <p>{t('improvementsCopy2')}</p>
            </article>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
