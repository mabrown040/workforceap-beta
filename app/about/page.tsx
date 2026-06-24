import '@/css/marketing-v3-about.css';
import type { Metadata } from 'next';
import { buildPageMetadataAsync } from '@/app/seo';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import LocalizedLink from '@/components/LocalizedLink';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.about');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/about',
  });
}

export default async function AboutPage() {
  const t = await getTranslations('marketing.about');

  return (
    <div className="wa-v3">
      {/* ===== HERO: blend crimson→plum tile, same heading/subheading copy ===== */}
      <header className="wa-hero">
        <div className="wa-wrap">
          <div className="wa-tile wa-tile--hero">
            <h1>{t('heading')}</h1>
            <p>{t('subheading')}</p>
          </div>
        </div>
      </header>

      {/* ===== MISSION: prose column + decorative Austin photo tile ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-split">
            <div className="wa-prose">
              <p>
                WorkforceAP is dedicated to advancing careers and connecting skilled individuals
                with meaningful employment opportunities. Our mission is to bridge the gap between
                education and industry, ensuring that every participant is ready for the demands of
                the modern workforce.
              </p>
              <p>
                With over 25 years of workforce development leadership, we provide employer-aligned
                training, comprehensive career support, and funded pathways for qualifying members.
                Our programs are built around real industry needs—so graduates are job-ready from
                day one.
              </p>
            </div>
            <div className="wa-photo-tile" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ===== CLOSING CTA: convert mission readers into applicants (approved mockup) ===== */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-cta">
            <h2>{t('ctaTitle')}</h2>
            <p>{t('ctaCopy')}</p>
            <div className="wa-acts">
              <LocalizedLink href="/apply" className="wa-btn wa-btn--light">
                {t('ctaApply')}
              </LocalizedLink>
              <LocalizedLink href="/find-your-path" className="wa-btn wa-btn--translucent">
                {t('ctaFind')}
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <MobileBottomNav variant="marketing" />
    </div>
  );
}
