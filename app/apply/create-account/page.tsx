import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import ApplyMobileTrustBar from '@/components/apply/ApplyMobileTrustBar';
import Footer from '@/components/Footer';
import ApplyCreateAccountForm from './ApplyCreateAccountForm';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('apply');
  const base = await buildPageMetadataAsync({
    title: t('createAccountMetaTitle'),
    description: t('createAccountMetaDescription'),
    path: '/apply/create-account',
  });
  return { ...base, robots: { index: false, follow: false } };
}

export default async function ApplyCreateAccountPage() {
  const t = await getTranslations('apply');
  return (
    <div className="inner-page apply-funnel-step-page">
      <section className="page-hero apply-funnel-step-page__hero">
        <div className="page-hero-content">
          <h1>{t('createAccountHeroTitle')}</h1>
          <p>{t('createAccountHeroBody')}</p>
          <p style={{ marginTop: '0.75rem' }}>
            {t('createAccountHeroSub')}
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '560px', margin: '0 auto' }}>
            <ApplyMobileTrustBar />
            <ApplyMobileStepNav activeStep={2} />
            <Suspense fallback={<p>{t('loadingFallback')}</p>}>
              <ApplyCreateAccountForm />
            </Suspense>
            <p style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              {t('createAccountAlready')}{' '}
              <a href="/login">{t('createAccountLogIn')}</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
