import type { Metadata } from 'next';
import Image from 'next/image';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import LeadershipContent from './LeadershipContent';
import { getTranslations } from 'next-intl/server';
import '../../css/marketing-v3-leadership.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.leadership');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/leadership',
  });
}

const HERO_IMAGE_SRC = '/images/hero-people.webp';

export default async function LeadershipPage() {
  const t = await getTranslations('marketing.leadership');

  return (
    <div className="wa-v3">
      {/* ── Split hero ── */}
      <header className="wa-lead-hero">
        <div className="wa-wrap">
          <div className="wa-lead-hero-grid">
            <div className="wa-lead-hero-main">
              <div className="wa-lead-hero-photo" aria-hidden="true">
                <Image
                  src={HERO_IMAGE_SRC}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 60vw"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
              <span className="wa-eyebrow">{t('heroLabel')}</span>
              <h1>
                {t('heroHeadline1')}{' '}
                <span className="wa-accent">{t('heroHeadlineAccent')}</span>
              </h1>
              <p>{t('governanceBody')}</p>
            </div>

            <aside className="wa-quote-card">
              <div className="wa-qhead">
                <span className="wa-qbadge" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <span className="wa-qlabel">{t('established')}</span>
              </div>
              <blockquote>{t('quote')}</blockquote>
            </aside>
          </div>
        </div>
      </header>

      <LeadershipContent />
      <Footer />
    </div>
  );
}
