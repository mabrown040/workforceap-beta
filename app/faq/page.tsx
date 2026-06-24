import '@/css/marketing-v3-faq.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import FAQContent from './FAQContent';
import JsonLdFAQPage from '@/components/JsonLdFAQPage';
import { getTranslations } from 'next-intl/server';
import { MARKETING_FULL_BLEED_HERO_SIZES } from '@/lib/marketing/heroImage';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'FAQ: WIOA-Aligned Career Training & Certifications',
    description:
      'Answers about applying, eligibility, certifications, and job placement. For applicants, parents, partners, and anyone with questions.',
    path: '/faq',
  });
}

const HERO_IMAGE_SRC = '/images/hero-people.webp';

const ArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export default async function FAQPage() {
  const t = await getTranslations('marketing.faq');
  return (
    <div className="wa-v3 inner-page">
      {/* ===== HERO: knowledge-base header over crimson→plum gradient + photo ===== */}
      <header className="wa-faq-hero">
        <div className="wa-faq-hero-photo" aria-hidden="true">
          <Image
            src={HERO_IMAGE_SRC}
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
          <span className="wa-kb-chip">{t('knowledgeBase')}</span>
          <h1>
            {t('heroHeadline')} <span className="wa-accent">{t('heroHeadlineAccent')}</span>
          </h1>
          <p>{t('heroCopy')}</p>
        </div>
      </header>

      {/* ===== QUICK ANSWERS ===== */}
      <section className="wa-quick">
        <div className="wa-wrap">
          <div className="wa-quick-card">
            <div className="wa-faq-sec-head">
              <span className="wa-eyebrow">{t('quickAnswers')}</span>
              <h2>{t('quickAnswersTitle')}</h2>
            </div>
            <div className="wa-qgrid">
              <LocalizedLink href="/programs" className="wa-qcard">
                <h3>{t('faq1q')}</h3>
                <p>{t('faq1a')}</p>
                <span className="wa-go">
                  {t('faq1cta')} <ArrowRight />
                </span>
              </LocalizedLink>
              <LocalizedLink href="/find-your-path" className="wa-qcard">
                <h3>{t('faq2q')}</h3>
                <p>{t('faq2a')}</p>
                <span className="wa-go">
                  {t('faq2cta')} <ArrowRight />
                </span>
              </LocalizedLink>
              <LocalizedLink href="/apply" className="wa-qcard">
                <h3>{t('faq3q')}</h3>
                <p>{t('faq3a')}</p>
                <span className="wa-go">
                  {t('faq3cta')} <ArrowRight />
                </span>
              </LocalizedLink>
              <LocalizedLink href="/programs" className="wa-qcard">
                <h3>{t('faq4q')}</h3>
                <p>{t('faq4a')}</p>
                <span className="wa-go">
                  {t('faq4cta')} <ArrowRight />
                </span>
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <FAQContent />
      <JsonLdFAQPage />
      <Footer />
      <MobileBottomNav />
      {/* Spacer for mobile bottom nav — ensures footer content is not hidden */}
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
