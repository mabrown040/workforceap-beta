import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';
import { getTranslations } from 'next-intl/server';

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

export default async function AccessibilityPage() {
  const t = await getTranslations('marketing.accessibility');

  return (
    <div className="inner-page marketing-mobile-pb-for-bottom-nav">
      <section className="content-section">
        <div style={sectionStyle}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'block' }}>
            {t('eyebrow')}
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>{t('heading')}</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            {t('intro')}
          </p>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{t('helpTitle')}</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
              {t('helpCopy')}
            </p>
            <ul style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
              <li>{t('helpEmail')} <a href="mailto:info@workforceap.org">info@workforceap.org</a></li>
              <li>{t('helpPhone')} <a href="tel:+15127771808">(512) 777-1808</a></li>
              <li><Link href="/contact">{t('helpForm')}</Link></li>
            </ul>
          </div>
          <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{t('improvementsTitle')}</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '0.75rem' }}>
              {t('improvementsCopy1')}
            </p>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, margin: 0 }}>
              {t('improvementsCopy2')}
            </p>
          </div>
        </div>
      </section>
      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
