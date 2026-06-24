import '@/css/marketing-v3-careers.css';

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import { formatWapJobType, loadOpenWapJobs } from '@/lib/marketing/wapJobs';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';
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
    {
      title: t('whyMissionTitle'),
      description: t('whyMissionBody'),
      iconClass: 'wa-ic--accent',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 2" />
        </svg>
      ),
    },
    {
      title: t('whyAiTitle'),
      description: t('whyAiBody'),
      iconClass: 'wa-ic--info',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
        </svg>
      ),
    },
    {
      title: t('whyEquityTitle'),
      description: t('whyEquityBody'),
      iconClass: 'wa-ic--gold',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v18M5 7h14M5 7l-2 5a3.5 3.5 0 0 0 4 0zM19 7l2 5a3.5 3.5 0 0 1-4 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="wa-v3 careers-page">
      {/* ===== HERO: full-bleed photo behind crimson→plum gradient ===== */}
      <header className="wa-careers-hero">
        <div className="wa-careers-hero-photo" aria-hidden="true">
          <Image
            src="/images/hero-people.webp"
            alt=""
            fill
            priority
            fetchPriority="high"
            sizes={MARKETING_FULL_BLEED_HERO_SIZES}
            quality={85}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
        <div className="wa-wrap">
          <div className="wa-careers-hero-in">
            <span className="wa-ribbon">{t('heroEyebrow')}</span>
            <h1>{t('heroHeadline')}</h1>
            <p>{t('heroSubhead')}</p>
            <div className="wa-careers-hero-actions">
              <a href="#open-roles" className="wa-btn wa-btn--light">
                {t('heroCta')}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ===== WHY WORK HERE ===== */}
      <section className="wa-band" id="why">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('whyEyebrow')}</span>
            <h2>{t('whyTitle')}</h2>
            <p>{t('whySubtitle')}</p>
          </div>
          <div className="wa-pgrid">
            {whyItems.map((item) => (
              <article key={item.title} className="wa-pcard">
                <div className={`wa-ic ${item.iconClass}`}>{item.icon}</div>
                <h3>{item.title}</h3>
                <p className="wa-muted">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== OPEN ROLES ===== */}
      <section className="wa-band wa-band--surface" id="open-roles">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('rolesEyebrow')}</span>
            <h2>{t('rolesTitle')}</h2>
            <p>{t('rolesSubtitle')}</p>
          </div>
          {jobs.length === 0 ? (
            <div className="wa-empty-roles">
              <div className="wa-ic">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M3 12h18" />
                </svg>
              </div>
              <p>{t('rolesEmpty')}</p>
            </div>
          ) : (
            <div className="wa-roles">
              {jobs.map((job) => (
                <article key={job.id} className="wa-role-card">
                  <div className="wa-role-head">
                    <h3>{job.title}</h3>
                    <div className="wa-role-tags">
                      <span className="wa-tag">{formatWapJobType(job.type)}</span>
                      <span className="wa-role-loc">{job.location}</span>
                    </div>
                  </div>
                  <div className="wa-role-desc">
                    <ReactMarkdown>{job.descriptionMd}</ReactMarkdown>
                  </div>
                  {job.applyUrl.startsWith('http') ? (
                    <a
                      href={job.applyUrl}
                      className="wa-btn wa-btn--primary"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('applyCta')}
                    </a>
                  ) : (
                    <Link
                      href={`?role=${encodeURIComponent(job.title)}#careers-interest`}
                      className="wa-btn wa-btn--primary"
                    >
                      {t('applyCta')}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== STAY IN TOUCH / INTEREST FORM ===== */}
      <section className="wa-band" id="careers-interest">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('interestEyebrow')}</span>
            <h2>{t('interestTitle')}</h2>
            <p>{t('interestSubtitle')}</p>
          </div>
          <div className="wa-form-card">
            <CareersInterestForm />
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
