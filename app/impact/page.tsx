import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';
import { getTranslations } from 'next-intl/server';
import { SectionHeader, InfoCard } from '@/components/marketing/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.impact');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/impact',
  });
}

export default async function ImpactPage() {
  const t = await getTranslations('marketing.impact');

  return (
    <div className="inner-page marketing-mobile-pb-for-bottom-nav">
      <section className="content-section" style={{ paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={
              <>
                {t('heading')} <span style={{ color: 'var(--color-accent)' }}>{t('headingAccent')}</span>
              </>
            }
            subtitle={t('intro')}
            align="left"
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '2.5rem',
            }}
          >
            <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: '0.75rem' }}>25+</div>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('stat1Label')}</p>
            </div>
            <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: '0.75rem' }}>2,000+</div>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('stat2Label')}</p>
            </div>
            <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: '0.75rem' }}>{String(WORKFORCEAP_PROGRAM_CATALOG_SIZE)}</div>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('stat3Label')}</p>
            </div>
            <div className="portal-card portal-card--flat" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-accent)', lineHeight: 1, marginBottom: '0.75rem' }}>$0</div>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>{t('stat4Label')}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <InfoCard title={t('modelTitle')} description={t('modelDesc')} variant="flat" />
            <InfoCard title={t('membersTitle')} description={t('membersDesc')} variant="flat" />
            <InfoCard title={t('whyTitle')} description={t('whyDesc')} variant="flat" />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2rem' }}>
            <Link href="/apply" className="btn btn-primary">{t('ctaApply')}</Link>
            <Link href="/what-we-do" className="btn btn-outline">{t('ctaLearn')}</Link>
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
