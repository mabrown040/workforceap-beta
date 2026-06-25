import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import ApplyMobileTrustBar from '@/components/apply/ApplyMobileTrustBar';
import Footer from '@/components/Footer';
import ApplyPageSkeleton from '../ApplyPageSkeleton';
import ApplyResultsClient from './ApplyResultsClient';
import { getTranslations } from 'next-intl/server';
import '../apply-funnel-depth.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('apply');
  return buildPageMetadataAsync({
    title: t('resultsMetaTitle'),
    description: t('resultsMetaDescription'),
    path: '/apply/results',
  });
}

export default async function ApplyResultsPage() {
  const t = await getTranslations('apply');
  return (
    <div className="inner-page apply-funnel-step-page mdx afd-page">
      <section className="page-hero apply-funnel-step-page__hero afd-hero-wrap">
        <div className="page-hero-content mdx-stage">
          <span className="mdx-pill">{t('heroLabel')}</span>
          <h1><span className="mdx-grad-accent">{t('resultsHeroTitle')}</span></h1>
          <p>{t('resultsHeroBody')}</p>
        </div>
      </section>

      <section className="content-section afd-band">
        <div className="container">
          <ApplyMobileTrustBar />
          <ApplyMobileStepNav activeStep={1} showTimeHint />
          <p className="apply-funnel-form-kicker afd-kicker" role="note">
            {t('resultsKicker')}
          </p>
          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyResultsClient />
          </Suspense>
        </div>
      </section>

      <Footer />
    </div>
  );
}
