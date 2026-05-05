import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';
import './leadership.css';
import { prisma } from '@/lib/db/prisma';
import { getPlacementPublicMetrics } from '@/lib/outcomes/placementPublicMetrics';
import PlacementTrustCallout from '@/components/marketing/PlacementTrustCallout';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.leadership');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/leadership',
  });
}

export default async function LeadershipPage() {
  const t = await getTranslations('marketing.leadership');
  let placementMetrics = {
    placedCount: 0,
    withRetentionNote: 0,
    lastPlacedAt: null as Date | null,
    asOfLabel: 'Outcomes data unavailable',
  };
  try {
    placementMetrics = await getPlacementPublicMetrics(prisma);
  } catch {
    // keep defaults
  }

  return (
    <div className="inner-page">
      {/* ── Hero Section ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .leadership-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
      <section className="content-section" style={{ paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <div
            className="editorial-grid leadership-hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '3rem',
              alignItems: 'start',
            }}
          >
            {/* Left — 2/3 */}
            <div>
              <span
                className="text-label-upper"
                style={{
                  display: 'inline-block',
                  padding: '0.3rem 0.85rem',
                  background: 'rgba(173,44,77,0.08)',
                  color: 'var(--color-accent)',
                  borderRadius: 'var(--radius-full)',
                  marginBottom: '1.75rem',
                  fontSize: '0.7rem',
                  letterSpacing: '0.08em',
                }}
              >
                {t('heroLabel')}
              </span>

              <h1
                className="text-display-lg"
                style={{
                  color: 'var(--color-on-surface)',
                  marginBottom: '2rem',
                  lineHeight: 1.08,
                }}
              >
                {t('heroHeadline1')}{' '}
                <span
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-accent-light), var(--color-accent))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {t('heroHeadlineAccent')}
                </span>
              </h1>

              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--color-on-surface-variant)',
                  maxWidth: '44rem',
                  lineHeight: 1.75,
                }}
              >
                {t('governanceBody')}
              </p>
            </div>

            {/* Right — 1/3 quote card */}
            <div
              style={{
                background: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-xl, 1rem)',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--color-accent)',
                  alignSelf: 'flex-start',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">
                  verified
                </span>
                <span
                  className="text-label-upper"
                  style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}
                >
                  {t('established')}
                </span>
              </div>

              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-on-surface-variant)',
                  fontStyle: 'italic',
                  borderLeft: '2px solid var(--color-accent)',
                  paddingLeft: '1rem',
                  lineHeight: 1.7,
                  margin: 0,
                  opacity: 0.85,
                }}
              >
                &ldquo;{t('quote')}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-section" style={{ background: 'var(--surface-container-low)', paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <span className="text-label-upper" style={{ color: 'var(--color-accent)', display: 'block', marginBottom: '0.75rem' }}>
            {t('outcomesEyebrow')}
          </span>
          <h2 className="text-display-sm" style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>
            {t('outcomesTitle')}
          </h2>
          <PlacementTrustCallout metrics={placementMetrics} variant="inline" />
          <p style={{ margin: '1rem 0 0', fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
            {t('outcomesDisclaimer')}
          </p>
        </div>
      </section>

      <LeadershipContent />
      <Footer />
    </div>
  );
}
