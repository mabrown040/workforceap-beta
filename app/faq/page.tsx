import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import FAQContent from './FAQContent';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'FAQ: WIOA-Aligned Career Training & Certifications',
    description:
      'Answers about applying, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
    path: '/faq',
  });
}

export default async function FAQPage() {
  const t = await getTranslations('marketing.faq');
  return (
    <div className="inner-page">
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span
                className="text-label-upper"
                style={{
                  color: 'var(--color-accent)',
                  background: 'rgba(173,44,77,0.1)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(173,44,77,0.2)',
                  fontSize: '0.65rem',
                }}
              >
                {t('knowledgeBase')}
              </span>
            </div>
            <h1 className="text-display-lg" style={{ color: 'var(--color-on-surface)', maxWidth: '48rem', marginBottom: '1rem' }}>
              {t('heroHeadline')} <span style={{ background: 'linear-gradient(to bottom right, var(--color-accent-light), var(--color-accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{t('heroHeadlineAccent')}</span>
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--color-on-surface-variant)', maxWidth: '42rem', lineHeight: 1.7, fontWeight: 300, margin: 0 }}>
              {t('heroCopy')}
            </p>
          </div>
        </div>
      </section>

      <section className="content-section" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{
              padding: '1.5rem',
              borderRadius: '1rem',
              background: 'var(--surface-container-low)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <p className="text-label-upper" style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}>
                {t('quickAnswers')}
              </p>
              <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-on-surface)' }}>
                {t('quickAnswersTitle')}
              </h2>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.875rem',
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{t('faq1q')}</h3>
                <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', fontSize: '0.92rem' }}>
                  {t('faq1a')}
                </p>
                <Link href="/programs" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                  {t('faq1cta')} →
                </Link>
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.875rem',
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{t('faq2q')}</h3>
                <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', fontSize: '0.92rem' }}>
                  {t('faq2a')}
                </p>
                <Link href="/find-your-path" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                  {t('faq2cta')} →
                </Link>
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.875rem',
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{t('faq3q')}</h3>
                <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', fontSize: '0.92rem' }}>
                  {t('faq3a')}
                </p>
                <Link href="/apply" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                  {t('faq3cta')} →
                </Link>
              </div>
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '0.875rem',
                  background: 'var(--surface-container-high)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: 'var(--color-on-surface)' }}>{t('faq4q')}</h3>
                <p style={{ margin: '0 0 0.75rem', lineHeight: 1.6, color: 'var(--color-on-surface-variant)', fontSize: '0.92rem' }}>
                  {t('faq4a')}
                </p>
                <Link href="/programs" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                  {t('faq4cta')} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FAQContent />
      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
