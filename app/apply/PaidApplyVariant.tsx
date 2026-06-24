'use client';

import { Suspense, useCallback, useEffect, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import UtmCapture from '@/components/marketing/UtmCapture';
import { trackPaidApplyVariantRendered } from '@/lib/analytics/events';
import {
  UTM_SOURCE_COOKIE,
  UTM_SOURCE_COOKIE_MAX_AGE,
  type PaidApplyUtmSource,
} from '@/lib/apply/paidApplyUtm';
import { useApplyStickyCtaVisibility } from '@/lib/apply/useApplyStickyCtaVisibility';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';
import PreLaunchTag from '@/components/portal/PreLaunchTag';

const PAID_APPLY_ELIGIBILITY_ID = 'paid-apply-eligibility';

type PaidApplyVariantProps = {
  utmSource: PaidApplyUtmSource;
  program?: string;
  stepNav?: ReactNode;
  mobileTrustBar?: ReactNode;
  proofBlock?: ReactNode;
  trustStrip?: ReactNode;
};

export default function PaidApplyVariant({ utmSource, stepNav, mobileTrustBar, proofBlock, trustStrip }: PaidApplyVariantProps) {
  const t = useTranslations('apply');
  const showStickyCta = useApplyStickyCtaVisibility(`#${PAID_APPLY_ELIGIBILITY_ID}`);

  useEffect(() => {
    document.cookie = `${UTM_SOURCE_COOKIE}=${encodeURIComponent(utmSource)};path=/;max-age=${UTM_SOURCE_COOKIE_MAX_AGE};SameSite=Lax`;
    trackPaidApplyVariantRendered(utmSource);
  }, [utmSource]);

  const scrollToEligibility = useCallback(() => {
    document.getElementById(PAID_APPLY_ELIGIBILITY_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="wa-v3 paid-apply-landing">
      <section className="paid-apply-hero" aria-labelledby="paid-apply-hero-heading">
        <div className="paid-apply-hero__inner">
          <h1 id="paid-apply-hero-heading" className="paid-apply-hero__heading">
            {t('paidHeroHeading')}
          </h1>
          <p className="paid-apply-hero__subhead">
            {t('paidHeroSubhead')}
          </p>
          <p className="paid-apply-hero__help-compact">
            {t('questionsCall')}{' '}
            <a href="tel:+15127771808" className="paid-apply-hero__help-compact__link">
              (512) 777-1808
            </a>
          </p>
          <button
            type="button"
            className={marketingButtonPresets.heroPrimary('paid-apply-hero__cta')}
            onClick={scrollToEligibility}
          >
            {t('paidHeroCta')}
          </button>
          <div className="paid-apply-hero__pilot">
            <PreLaunchTag compact />
          </div>
        </div>
      </section>

      <section
        id={PAID_APPLY_ELIGIBILITY_ID}
        className="paid-apply-form-section"
        aria-label="Eligibility application form"
      >
        <Suspense fallback={<ApplyPageSkeleton />}>
          <ApplyRefCapture />
          <UtmCapture />
        </Suspense>
        {mobileTrustBar}
        {stepNav}
        <p className="paid-apply-form-kicker" role="note">
          {t('paidFormKicker')}
        </p>
        {proofBlock}
        {trustStrip}
        <Suspense fallback={<ApplyPageSkeleton />}>
          <ApplyEligibilityClient variant="paid" />
        </Suspense>
      </section>

      {showStickyCta ? (
        <div className="paid-apply-sticky-cta" role="region" aria-label="Quick action">
          <button
            type="button"
            className={marketingButtonPresets.heroPrimary('paid-apply-sticky-cta__button')}
            onClick={scrollToEligibility}
          >
            {t('paidHeroCta')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
