import type { Metadata } from 'next';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { HeroSection, InfoCard, PageSection, SectionHeader } from '@/components/marketing/ui';
import { formatWapJobType, loadOpenWapJobs } from '@/lib/marketing/wapJobs';
import { marketingPrimaryButtonClasses } from '@/lib/marketing/buttonClasses';
import { getTranslations } from 'next-intl/server';
import CareersInterestForm from './CareersInterestForm';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.careers');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/careers',
  });
}

export default async function CareersPage() {
  const t = await getTranslations('marketing.careers');
  const jobs = await loadOpenWapJobs();

  const whyItems = [
    { title: t('whyMissionTitle'), description: t('whyMissionBody') },
    { title: t('whyAiTitle'), description: t('whyAiBody') },
    { title: t('whyEquityTitle'), description: t('whyEquityBody') },
  ];

  return (
    <div className="inner-page careers-page">
      <HeroSection
        backgroundImage="/images/hero-people.webp"
        priority
        minHeight="min(100vh, 44rem)"
        overlayGradient="linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.78) 50%, rgba(173,44,77,0.22) 100%)"
        eyebrow={t('heroEyebrow')}
        headline={
          <h1
            style={{
              margin: 0,
              color: 'var(--color-white)',
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              maxWidth: '20ch',
            }}
          >
            {t('heroHeadline')}
          </h1>
        }
        subheadline={t('heroSubhead')}
      >
        <a href="#open-roles" className={marketingPrimaryButtonClasses()} style={{ marginTop: '1.5rem', display: 'inline-flex' }}>
          {t('heroCta')}
        </a>
      </HeroSection>

      <PageSection>
        <SectionHeader eyebrow={t('whyEyebrow')} title={t('whyTitle')} subtitle={t('whySubtitle')} align="left" />
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            marginTop: '1.5rem',
          }}
        >
          {whyItems.map((item) => (
            <InfoCard key={item.title} title={item.title} description={item.description} variant="bordered" />
          ))}
        </div>
      </PageSection>

      <PageSection id="open-roles" style={{ borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <SectionHeader eyebrow={t('rolesEyebrow')} title={t('rolesTitle')} subtitle={t('rolesSubtitle')} align="left" />
        {jobs.length === 0 ? (
          <p style={{ marginTop: '1.5rem', color: 'var(--color-on-surface-variant)' }}>{t('rolesEmpty')}</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
            {jobs.map((job) => (
              <article
                key={job.id}
                className="portal-card portal-card--flat"
                style={{ padding: 'clamp(1.25rem, 3vw, 2rem)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                    {job.title}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        background: 'rgba(173, 44, 77, 0.12)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      {formatWapJobType(job.type)}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{job.location}</span>
                  </div>
                </div>
                <div
                  className="careers-job-description"
                  style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.65, fontSize: '0.95rem' }}
                >
                  <ReactMarkdown>{job.descriptionMd}</ReactMarkdown>
                </div>
                {job.applyUrl.startsWith('http') ? (
                  <a
                    href={job.applyUrl}
                    className={marketingPrimaryButtonClasses()}
                    style={{ marginTop: '1.25rem', display: 'inline-flex' }}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('applyCta')}
                  </a>
                ) : (
                  <Link
                    href={`?role=${encodeURIComponent(job.title)}#careers-interest`}
                    className={marketingPrimaryButtonClasses()}
                    style={{ marginTop: '1.25rem', display: 'inline-flex' }}
                  >
                    {t('applyCta')}
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </PageSection>

      <PageSection id="careers-interest" style={{ borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <SectionHeader eyebrow={t('interestEyebrow')} title={t('interestTitle')} subtitle={t('interestSubtitle')} align="left" />
        <div
          className="portal-card portal-card--flat"
          style={{ marginTop: '1.5rem', padding: 'clamp(1.25rem, 3vw, 2.5rem)', maxWidth: '720px' }}
        >
          <CareersInterestForm />
        </div>
      </PageSection>

      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />

      <style>{`
        .careers-job-description p { margin: 0 0 0.75rem; }
        .careers-job-description p:last-child { margin-bottom: 0; }
        .careers-job-description ul { margin: 0.5rem 0 0.75rem; padding-left: 1.25rem; }
        .careers-job-description strong { color: var(--color-on-surface); }
      `}</style>
    </div>
  );
}
