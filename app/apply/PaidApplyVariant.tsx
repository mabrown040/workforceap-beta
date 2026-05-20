'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
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
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

const PAID_APPLY_ELIGIBILITY_ID = 'paid-apply-eligibility';

type PaidApplyVariantProps = {
  utmSource: PaidApplyUtmSource;
  program?: string;
};

const TRUST_PILLS = ['WIOA-funded', '$0 cost', '850+ placed in TX'] as const;

export default function PaidApplyVariant({ utmSource }: PaidApplyVariantProps) {
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    document.cookie = `${UTM_SOURCE_COOKIE}=${encodeURIComponent(utmSource)};path=/;max-age=${UTM_SOURCE_COOKIE_MAX_AGE};SameSite=Lax`;
    trackPaidApplyVariantRendered(utmSource);
  }, [utmSource]);

  useEffect(() => {
    const onScroll = () => {
      setShowStickyCta(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToEligibility = useCallback(() => {
    document.getElementById(PAID_APPLY_ELIGIBILITY_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="paid-apply-landing">
      <section className="paid-apply-hero" aria-labelledby="paid-apply-hero-heading">
        <h1 id="paid-apply-hero-heading" className="paid-apply-hero__heading">
          Free IT certification — start in 30 minutes
        </h1>
        <button
          type="button"
          className={marketingButtonPresets.heroPrimary('paid-apply-hero__cta')}
          onClick={scrollToEligibility}
        >
          Start eligibility
        </button>
      </section>

      <div className="paid-apply-trust-row" role="list" aria-label="Program highlights">
        {TRUST_PILLS.map((pill) => (
          <span key={pill} className="paid-apply-trust-pill" role="listitem">
            {pill}
          </span>
        ))}
      </div>

      <section
        id={PAID_APPLY_ELIGIBILITY_ID}
        className="paid-apply-form-section"
        aria-label="Eligibility application form"
      >
        <Suspense fallback={<ApplyPageSkeleton />}>
          <ApplyRefCapture />
          <UtmCapture />
        </Suspense>
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
            Start eligibility
          </button>
        </div>
      ) : null}

      <style>{`
        .paid-apply-landing {
          font-family: var(--font-family);
          background: var(--surface-container-lowest);
          min-height: 100vh;
          padding-bottom: calc(var(--space-8) + 72px);
        }

        .paid-apply-hero {
          padding: var(--space-10) var(--space-6) var(--space-8);
          text-align: center;
          background: linear-gradient(
            165deg,
            var(--color-primary) 0%,
            #2a0a14 55%,
            var(--color-accent-dark) 100%
          );
          color: var(--color-white);
        }

        .paid-apply-hero__heading {
          font-size: clamp(2rem, 6vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.1;
          max-width: 720px;
          margin: 0 auto var(--space-6);
        }

        .paid-apply-hero__cta {
          min-width: min(100%, 320px);
        }

        .paid-apply-trust-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--space-3);
          padding: var(--space-5) var(--space-6);
          background: var(--surface-container);
          border-bottom: 1px solid var(--outline-variant);
        }

        .paid-apply-trust-pill {
          display: inline-flex;
          align-items: center;
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
          background: var(--surface-container-low);
          border: 1px solid var(--outline-variant);
          font-size: var(--font-size-sm);
          font-weight: 700;
          color: var(--color-on-surface);
          white-space: nowrap;
        }

        .paid-apply-form-section {
          max-width: 640px;
          margin: 0 auto;
          padding: var(--space-8) var(--space-6) var(--space-10);
        }

        .paid-apply-sticky-cta {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 40;
          padding: var(--space-3) var(--space-4) calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
          background: rgba(255, 255, 255, 0.96);
          border-top: 1px solid var(--outline-variant);
          box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(8px);
        }

        html.dark .paid-apply-sticky-cta {
          background: rgba(28, 27, 31, 0.96);
        }

        .paid-apply-sticky-cta__button {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          display: flex;
        }

        .apply-flow--paid .apply-step1-actions__primary {
          width: 100%;
        }

        .apply-flow--paid .apply-personal-grid {
          grid-template-columns: 1fr;
        }
      `}</style>
    </div>
  );
}
