import '@/css/marketing-v3-contact.css';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ContactFormClient from './ContactFormClient';
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
    <div className="wa-v3">
      {/* ===== HERO ===== */}
      <header className="wa-contact-hero">
        <div className="wa-wrap">
          <span className="wa-eyebrow">{t('getInTouch')}</span>
          <h1>
            {t('heroHeadline')} <span className="wa-accent">{t('heroHeadlineAccent')}</span> {t('heroHeadlineSuffix')}
          </h1>
          <p>{t('heroCopy')}</p>
        </div>
      </header>

      {/* ===== CONTACT GRID ===== */}
      <section className="wa-contact-section">
        <div className="wa-wrap">
          <div className="wa-contact-grid">
            {/* LEFT: form */}
            <div className="wa-panel">
              <h2>{t('sendUsMessage')}</h2>
              <ContactFormClient initialTopic={initialTopic} />
            </div>

            {/* RIGHT: info cards + austin */}
            <div className="wa-info-stack">
              <div className="wa-card-grid">
                <div className="wa-info-card">
                  <div className="wa-ic" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </div>
                  <h3>{t('card1Title')}</h3>
                  <p>
                    {t('card1Body1')}
                    <br />
                    {t('card1Body2')}
                  </p>
                </div>

                <div className="wa-info-card">
                  <div className="wa-ic" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="M3 7l9 6 9-6" />
                    </svg>
                  </div>
                  <h3>{t('card2Title')}</h3>
                  <p>
                    <a className="wa-link" href="mailto:info@workforceap.org">
                      info@workforceap.org
                    </a>
                  </p>
                </div>

                <div className="wa-info-card wa-info-card--gold">
                  <div className="wa-ic" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
                    </svg>
                  </div>
                  <h3>{t('card3Title')}</h3>
                  <p className="wa-mono">
                    <a href="tel:+15127771808" style={{ color: 'inherit' }}>
                      (512) 777-1808
                    </a>
                  </p>
                  <p>{t('card3Hours')}</p>
                </div>

                <div className="wa-info-card">
                  <div className="wa-ic" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  </div>
                  <h3>{t('card4Title')}</h3>
                  <p>{t('card4Body')}</p>
                </div>
              </div>

              <div className="wa-austin-card">
                <span className="wa-eyebrow">{t('austinTeam')}</span>
                <h3>{t('austinTitle')}</h3>
                <p>{t('austinBody')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== QUOTE ===== */}
      <section className="wa-quote-band">
        <div className="wa-wrap">
          <div className="wa-quote-card">
            <div className="wa-qmark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h4v4c0 3-2 5-4 5v-2c1 0 2-1 2-3H7V7zm8 0h4v4c0 3-2 5-4 5v-2c1 0 2-1 2-3h-2V7z" />
              </svg>
            </div>
            <blockquote>{t('quote')}</blockquote>
            <div className="wa-by">{t('teamName')}</div>
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
