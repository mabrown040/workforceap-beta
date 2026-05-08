import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';
import { PageSection, QuoteCard, SplitHero } from '@/components/marketing/ui';
import './leadership.css';
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

  return (
    <div className="inner-page">
      {/* ── Hero Section ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .split-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}} />
      <PageSection padding="lg">
        <SplitHero
          eyebrow={t('heroLabel')}
          headline={
            <>
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
            </>
          }
          subheadline={t('governanceBody')}
          sidebar={
            <QuoteCard
              icon={<span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">verified</span>}
              label={t('established')}
              quote={t('quote')}
            />
          }
        />
      </PageSection>

      <LeadershipContent />
      <Footer />
    </div>
  );
}
