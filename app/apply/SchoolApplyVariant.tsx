import { Suspense, type ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import UtmCapture from '@/components/marketing/UtmCapture';

/**
 * School-partner variant of the apply wizard (Phase B4).
 *
 * Rendered by `app/apply/page.tsx` only when the referral ref resolves to an
 * ACTIVE partner whose `partnerType` is `high_school`. Deliberately thin: the
 * behavior that matters — school-appropriate questions in place of the adult
 * workforce-funding screener, and guardian capture for minors — lives in
 * `ApplyEligibilityClient`'s `school` variant. This file is the frame around
 * it, mirroring `PaidApplyVariant`'s shape.
 *
 * Only the three partner fields the wizard actually renders are passed in; the
 * partner id and every internal column stay on the server.
 */

export type SchoolApplyPartnerSummary = {
  name: string;
  slug: string;
  schoolDistrict: string | null;
};

type SchoolApplyVariantProps = {
  schoolPartner: SchoolApplyPartnerSummary;
  program?: string;
  stepNav?: ReactNode;
  trustStrip?: ReactNode;
};

const SCHOOL_APPLY_ELIGIBILITY_ID = 'school-apply-eligibility';

export default async function SchoolApplyVariant({
  schoolPartner,
  stepNav,
  trustStrip,
}: SchoolApplyVariantProps) {
  const t = await getTranslations('apply');
  const schoolName = schoolPartner.name.trim();

  return (
    <div className="school-apply-landing">
      <section className="school-apply-hero" aria-labelledby="school-apply-hero-heading">
        <p className="school-apply-hero__kicker">{t('schoolHeroKicker')}</p>
        <h1 id="school-apply-hero-heading" className="school-apply-hero__heading">
          {t('schoolHeroHeading', { schoolName })}
        </h1>
        <p className="school-apply-hero__subhead">{t('schoolHeroSubhead', { schoolName })}</p>
      </section>

      <section
        id={SCHOOL_APPLY_ELIGIBILITY_ID}
        className="school-apply-form-section"
        aria-label={t('ariaEligibilityForm')}
      >
        <Suspense fallback={<ApplyPageSkeleton />}>
          <ApplyRefCapture />
          <UtmCapture />
        </Suspense>
        {stepNav}
        {trustStrip}
        <Suspense fallback={<ApplyPageSkeleton />}>
          <ApplyEligibilityClient variant="school" schoolPartner={schoolPartner} />
        </Suspense>
      </section>

      <style>{`
        .school-apply-landing {
          font-family: var(--font-family);
          background: var(--surface-container-lowest);
          min-height: 100vh;
        }

        .school-apply-hero {
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

        .school-apply-hero__kicker {
          margin: 0 0 var(--space-3);
          font-size: var(--font-size-sm);
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-gold);
        }

        .school-apply-hero__heading {
          font-size: clamp(1.75rem, 5vw, 2.75rem);
          font-weight: 800;
          line-height: 1.15;
          max-width: 720px;
          margin: 0 auto var(--space-4);
        }

        .school-apply-hero__subhead {
          max-width: 560px;
          margin: 0 auto;
          font-size: clamp(0.9375rem, 2.5vw, 1.05rem);
          line-height: var(--line-height-normal);
          color: rgba(255, 255, 255, 0.88);
        }

        .school-apply-form-section {
          display: flex;
          flex-direction: column;
          max-width: 640px;
          margin: 0 auto;
          padding: var(--space-8) var(--space-6) var(--space-12);
        }

        @media (max-width: 768px) {
          .school-apply-hero {
            padding: calc(var(--nav-height-default, 80px) + var(--space-5)) var(--space-4) var(--space-6);
          }

          .school-apply-form-section {
            padding: var(--space-6) var(--space-4) var(--space-10);
          }
        }
      `}</style>
    </div>
  );
}
