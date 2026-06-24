import '@/css/marketing-v3-mentor.css';
import LocalizedLink from '@/components/LocalizedLink';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buildPageMetadataAsync } from '@/app/seo';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.mentor');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/mentor',
  });
}

export default async function BecomeMentorPage() {
  const t = await getTranslations('marketing.mentor');

  const benefits = [
    {
      title: t('benefit1Title'),
      desc: t('benefit1Desc'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h4" />
        </svg>
      ),
    },
    {
      title: t('benefit2Title'),
      desc: t('benefit2Desc'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      ),
    },
    {
      title: t('benefit3Title'),
      desc: t('benefit3Desc'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 17a4 4 0 0 1-4-4M7 13a4 4 0 0 1 8 0" />
          <path d="M12 3l2.5 2.5L12 8 9.5 5.5z" />
          <path d="M5 21c0-3 3-5 7-5s7 2 7 5" />
        </svg>
      ),
    },
    {
      title: t('benefit4Title'),
      desc: t('benefit4Desc'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="wa-v3">
      {/* ── Mentor waitlist banner ── */}
      <section className="wa-waitlist" aria-label="Mentor waitlist">
        <div className="wa-wrap wa-waitlist-in">
          <div className="wa-waitlist-txt">
            <div className="wa-waitlist-eb">{t('waitlistEyebrow')}</div>
            <p>{t('waitlistCopy')}</p>
          </div>
          <LocalizedLink href="/mentor/apply" className="wa-btn wa-btn--primary wa-btn--small">
            {t('waitlistCta')}
          </LocalizedLink>
        </div>
      </section>

      {/* ── Hero (crimson→plum tile, reskinned CTABand dark) ── */}
      <header className="wa-mentor-hero">
        <div className="wa-wrap">
          <div className="wa-mentor-hero-tile">
            <h1>{t('heroHeadline')}</h1>
            <p>{t('heroSubheadline')}</p>
            <div className="wa-mentor-hero-actions">
              <LocalizedLink href="/mentor/apply" className="wa-btn wa-btn--light">
                {t('heroCta')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </header>

      {/* ── Benefits ── */}
      <section className="wa-mentor-band">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('benefitsEyebrow')}</span>
            <h2>{t('benefitsTitle')}</h2>
          </div>

          <div className="wa-vgrid">
            {benefits.map((b) => (
              <div className="wa-vcard" key={b.title}>
                <div className="wa-ic">{b.icon}</div>
                <h3>{b.title}</h3>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="wa-apply-cta">
            <LocalizedLink href="/mentor/apply" className="wa-btn wa-btn--primary">
              {t('applyCta')}
            </LocalizedLink>
          </div>
        </div>
      </section>
    </div>
  );
}
