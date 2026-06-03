'use client';

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
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
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

const PAID_APPLY_ELIGIBILITY_ID = 'paid-apply-eligibility';

type PaidApplyVariantProps = {
  utmSource: PaidApplyUtmSource;
  program?: string;
  stepNav?: ReactNode;
  proofBlock?: ReactNode;
  trustStrip?: ReactNode;
};

export default function PaidApplyVariant({ utmSource, stepNav, proofBlock, trustStrip }: PaidApplyVariantProps) {
  const t = useTranslations('apply');
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
          No-cost IT training — start with a quick eligibility check.
        </h1>
        <p className="paid-apply-hero__subhead">
          About 5 minutes · 501(c)(3) nonprofit · advisor follow-up within 1–2 business days
        </p>
        <button
          type="button"
          className={marketingButtonPresets.heroPrimary('paid-apply-hero__cta')}
          onClick={scrollToEligibility}
        >
          Start eligibility check
        </button>
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
        {stepNav}
        <p className="paid-apply-form-kicker" role="note">
          {t('step1Kicker')}
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
            Start eligibility check
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
          padding: calc(var(--nav-height-default, 80px) + var(--space-8)) var(--space-6) var(--space-8);
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
          letter-spacing: 0;
          line-height: 1.1;
          max-width: 720px;
          margin: 0 auto var(--space-4);
        }

        .paid-apply-hero__subhead {
          max-width: 560px;
          margin: 0 auto var(--space-6);
          font-size: clamp(0.9375rem, 2.5vw, 1.05rem);
          line-height: var(--line-height-normal);
          color: rgba(255, 255, 255, 0.88);
        }

        .paid-apply-hero__cta {
          min-width: min(100%, 320px);
        }

        .paid-apply-form-section {
          display: flex;
          flex-direction: column;
          max-width: 640px;
          margin: 0 auto;
          padding: var(--space-8) var(--space-6) var(--space-12);
        }

        .paid-apply-form-kicker {
          display: none;
          margin: 0 0 var(--space-4);
          font-size: var(--font-size-sm);
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--color-accent-dark);
          line-height: var(--line-height-normal);
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

        .paid-apply-proof {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .paid-apply-proof__card {
          padding: var(--space-5);
          border-radius: var(--radius-lg);
          border: 1px solid var(--outline-variant);
          background: var(--surface-container);
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
        }

        .paid-apply-proof__badge-icon {
          font-size: 1.5rem;
          color: var(--color-green);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .paid-apply-proof__title {
          margin: 0 0 var(--space-2);
          font-size: var(--font-size-sm);
          font-weight: 700;
          color: var(--color-on-surface);
        }

        .paid-apply-proof__body {
          margin: 0 0 var(--space-4);
          font-size: var(--font-size-sm);
          line-height: var(--line-height-normal);
          color: var(--color-on-surface-variant);
        }

        .paid-apply-proof__actions {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
        }

        .paid-apply-proof__help-link {
          min-height: 44px;
        }

        @media (max-width: 768px) {
          .paid-apply-hero {
            padding: calc(var(--nav-height-default, 80px) + var(--space-5)) var(--space-4) var(--space-6);
          }

          .paid-apply-form-section {
            padding: var(--space-6) var(--space-4) calc(var(--space-10) + 4.5rem + env(safe-area-inset-bottom, 0px));
          }

          .paid-apply-form-kicker {
            display: block;
            order: 1;
          }

          .paid-apply-form-section .apply-mobile-step-nav {
            order: 0;
          }

          /* Form first on mobile — proof card stays below the fold until after eligibility */
          .paid-apply-form-section .trust-strip--apply {
            order: 2;
            margin-bottom: var(--space-4);
          }

          .paid-apply-form-section .apply-flow--paid {
            order: 3;
          }

          .paid-apply-form-section .paid-apply-proof {
            order: 4;
            margin-top: var(--space-6);
            margin-bottom: 0;
          }

          .paid-apply-form-section .paid-apply-form-kicker {
            order: 1;
          }

          .apply-flow--paid .apply-step1-actions {
            scroll-margin-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
          }

          #paid-apply-eligibility {
            scroll-margin-top: calc(var(--nav-height-default, 80px) + var(--space-4));
          }
        }
      `}</style>
    </div>
  );
}
