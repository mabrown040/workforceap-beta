import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildPageMetadataAsync } from '@/app/seo';
import { SectionHeader, InfoCard } from '@/components/marketing/ui';
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
          <InfoCard title={t('helpTitle')} description={
            <>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, marginBottom: '0.75rem' }}>
                {t('helpCopy')}
              </p>
              <ul style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, paddingLeft: '1.25rem', margin: 0 }}>
                <li>{t('helpEmail')} <a href="mailto:info@workforceap.org">info@workforceap.org</a></li>
                <li>{t('helpPhone')} <a href="tel:+15127771808">(512) 777-1808</a></li>
                <li><Link href="/contact">{t('helpForm')}</Link></li>
              </ul>
            </>
          } variant="flat" />
          <InfoCard title={t('improvementsTitle')} description={
            <>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, marginBottom: '0.75rem' }}>
                {t('improvementsCopy1')}
              </p>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.8, margin: 0 }}>
                {t('improvementsCopy2')}
              </p>
            </>
          } variant="flat" />
        </div>
      </section>
      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
