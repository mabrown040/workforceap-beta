import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ContactFormClient from './ContactFormClient';
import { ContactInfoCard, InfoCard, PageSection, QuoteCard, SectionHeader } from '@/components/marketing/ui';
import { getTranslations } from 'next-intl/server';

function getPrefilledTopic(topicParam?: string | string[]): string {
  const raw = Array.isArray(topicParam) ? topicParam[0] : topicParam;
  const topic = raw?.trim().toLowerCase();
  if (!topic) return '';

  const topicMap: Record<string, string> = {
    partnership: 'Partnership or sponsorship',
    partnerships: 'Partnership or sponsorship',
    sponsorship: 'Partnership or sponsorship',
    sponsor: 'Partnership or sponsorship',
    program: 'Program information',
    eligibility: 'Eligibility or no-cost member training',
    application: 'Application help',
    tour: 'Schedule a tour',
    media: 'Media or press inquiry',
    press: 'Media or press inquiry',
    other: 'Other',
  };

  return topicMap[topic] ?? '';
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.contact');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/contact',
  });
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams?: Promise<{ topic?: string | string[] }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialTopic = getPrefilledTopic(resolvedSearchParams?.topic);
  const t = await getTranslations('marketing.contact');

  return (
    <div className="inner-page contact-page">
      <section className="content-section" style={{ paddingBottom: '2rem' }}>
        <div className="container" style={{ maxWidth: 1400 }}>
          <SectionHeader
            eyebrow={t('getInTouch')}
            title={
              <>
                {t('heroHeadline')} <span style={{ color: 'var(--color-accent)' }}>{t('heroHeadlineAccent')}</span> {t('heroHeadlineSuffix')}
              </>
            }
            subtitle={t('heroCopy')}
            align="left"
            titleAs="h1"
          />

          <div className="contact-grid" style={{ display: 'grid', gap: '2rem', alignItems: 'start' }}>
            <div>
              <div className="portal-card portal-card--flat" style={{ padding: 'clamp(1.25rem, 3vw, 2.5rem)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-on-surface)' }}>
                  {t('sendUsMessage')}
                </h2>
                <ContactFormClient initialTopic={initialTopic} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="contact-card-grid" style={{ display: 'grid', gap: '1rem' }}>
                <ContactInfoCard icon="location_on" title={t('card1Title')}>
                  <>
                    {t('card1Body1')}
                    <br />
                    {t('card1Body2')}
                  </>
                </ContactInfoCard>
                <ContactInfoCard icon="alternate_email" title={t('card2Title')}>
                  <a href="mailto:info@workforceap.org" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                    info@workforceap.org
                  </a>
                </ContactInfoCard>
                <ContactInfoCard
                  icon="call"
                  title={t('card3Title')}
                  accentBg="rgba(255,187,0,0.12)"
                  accentColor="#7b5800"
                >
                  <>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontFamily: 'monospace' }}>
                      <a href="tel:+15127771808" style={{ color: 'inherit' }}>(512) 777-1808</a>
                    </p>
                    <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', margin: '0.35rem 0 0' }}>
                      {t('card3Hours')}
                    </p>
                  </>
                </ContactInfoCard>
                <ContactInfoCard icon="schedule" title={t('card4Title')}>
                  {t('card4Body')}
                </ContactInfoCard>
              </div>

              <InfoCard
                eyebrow={t('austinTeam')}
                title={t('austinTitle')}
                description={t('austinBody')}
                variant="flat"
              />
            </div>
          </div>
        </div>
      </section>

      <PageSection style={{ paddingTop: '2rem', borderTop: '1px solid rgba(88,65,68,0.1)' }}>
        <QuoteCard
          icon={<span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }} aria-hidden="true">format_quote</span>}
          label={t('teamName')}
          quote={t('quote')}
        />
      </PageSection>

      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />

      <style>{`
        .contact-grid {
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
        }
        .contact-card-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 1023px) {
          .contact-grid,
          .contact-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
