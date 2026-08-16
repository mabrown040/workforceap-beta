import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { buildPageMetadataAsync } from '@/app/seo';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import ApplyMobileTrustBar from '@/components/apply/ApplyMobileTrustBar';
import Footer from '@/components/Footer';
import ApplyCreateAccountForm from './ApplyCreateAccountForm';
import { getTranslations } from 'next-intl/server';
import { APPLY_REFERRAL_COOKIE } from '@/lib/partner/sponsoredEnrollment';
import { resolveSchoolApply } from '@/lib/apply/resolveSchoolApply';
import '../apply-funnel-depth.css';

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
  const cookieStore = await cookies();
  const schoolApply = await resolveSchoolApply(cookieStore.get(APPLY_REFERRAL_COOKIE)?.value ?? null);
  const isSchool = Boolean(schoolApply);
  return (
    <div className="inner-page apply-funnel-step-page mdx afd-page">
      <section className="page-hero apply-funnel-step-page__hero afd-hero-wrap">
        <div className="page-hero-content mdx-stage">
          <span className="mdx-pill">{isSchool ? t('schoolHeroLabel') : t('heroLabel')}</span>
          <h1><span className="mdx-grad-accent">{t('createAccountHeroTitle')}</span></h1>
          <p>{isSchool ? t('schoolCreateAccountHeroBody') : t('createAccountHeroBody')}</p>
          <p style={{ marginTop: '0.75rem' }}>
            {t('createAccountHeroSub')}
          </p>
        </div>
      </section>

      <section className="content-section afd-band">
        <div className="container">
          <div className="mdx-card afd-surface" style={{ maxWidth: '560px', margin: '0 auto' }}>
            <ApplyMobileTrustBar />
            <ApplyMobileStepNav activeStep={2} showTimeHint school={isSchool} />
            <p className="apply-funnel-form-kicker afd-kicker" role="note">
              {t('createAccountFormKicker')}
            </p>
            <Suspense fallback={<p>{t('loadingFallback')}</p>}>
              <ApplyCreateAccountForm />
            </Suspense>
            <p className="afd-footnote">
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
