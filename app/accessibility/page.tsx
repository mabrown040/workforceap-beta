import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';
import { SectionHeader, InfoCard } from '@/components/marketing/ui';
import { getTranslations } from 'next-intl/server';

/**
 * Date this accessibility statement was last reviewed end-to-end (not just
 * edited). Bump when the known-exceptions list, target conformance level,
 * or reporting channel changes.
 */
const ACCESSIBILITY_LAST_REVIEWED_AT = '2026-05-19';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.accessibility');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/accessibility',
  });
}

const sectionStyle: CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '0 1.25rem',
};

function formatLastReviewed(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function AccessibilityPage() {
  const t = await getTranslations('marketing.accessibility');
  const lastReviewed = formatLastReviewed(ACCESSIBILITY_LAST_REVIEWED_AT);

  return (
    <div className="inner-page">
      <h1 className="wa-sr-only">{t('heading')}</h1>
      <section className="content-section">
        <div style={sectionStyle}>
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('heading')}
            subtitle={t('intro')}
            align="left"
          />

          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
            {t('lastReviewedLabel')}: {lastReviewed}
          </p>

          <InfoCard
            title={t('commitmentTitle')}
            description={
              <>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                  {t('commitmentCopy1')}
                </p>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, margin: 0 }}>
                  {t('commitmentCopy2')}
                </p>
              </>
            }
            variant="flat"
          />

          <InfoCard
            title={t('exceptionsTitle')}
            description={
              <>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                  {t('exceptionsCopy')}
                </p>
                <ul style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
                  <li>{t('exception1')}</li>
                  <li>{t('exception2')}</li>
                  <li>{t('exception3')}</li>
                </ul>
              </>
            }
            variant="flat"
          />

          <InfoCard
            title={t('helpTitle')}
            description={
              <>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                  {t('helpCopy')}
                </p>
                <ul style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
                  <li>{t('helpEmail')} <a href="mailto:info@workforceap.org">info@workforceap.org</a></li>
                  <li>{t('helpPhone')} <a href="tel:+15127771808">(512) 777-1808</a></li>
                  <li>
                    <LocalizedLink href="/contact?topic=accessibility">{t('helpForm')}</LocalizedLink>
                  </li>
                </ul>
              </>
            }
            variant="flat"
          />

          <InfoCard
            title={t('improvementsTitle')}
            description={
              <>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                  {t('improvementsCopy1')}
                </p>
                <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, margin: 0 }}>
                  {t('improvementsCopy2')}
                </p>
              </>
            }
            variant="flat"
          />
        </div>
      </section>
      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
