import type { Metadata } from 'next';
import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import { buildPageMetadataAsync } from '@/app/seo';
import { redirect } from 'next/navigation';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import EmployerContactForm from './EmployerContactForm';
import EmployersHeroCtaExperiment from '@/components/marketing/employers/EmployersHeroCtaExperiment';
import EmployerCaseStudyCard from '@/components/marketing/EmployerCaseStudyCard';
import {
  HeroSection,
  PageSection,
  ProcessStep,
  SectionHeader,
} from '@/components/marketing/ui';
import { EMPLOYER_CASE_STUDIES } from '@/lib/content/employer-case-studies';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import {
  formatEmployerTrustStat,
  getEmployerHiringPartnerCtaHref,
  getEmployerPlacementFeeDisplay,
  getEmployerTrustPlaceholders,
  isEmployerHiringPartnerCtaExternal,
  loadEmployerLandingTrustMetrics,
} from '@/lib/marketing/employerLanding';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('marketing.employers');
  return buildPageMetadataAsync({
    title: t('title'),
    description: t('description'),
    path: '/employers',
    image: '/images/og/employers.webp',
  });
}

function formatWage(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return k % 1 === 0 ? `$${k}K` : `$${k.toFixed(1)}K`;
  }
  return `$${amount.toLocaleString('en-US')}`;
}

export default async function EmployersPage() {
  const t = await getTranslations('marketing.employers');
  const user = await getUser();
  if (user) {
    const employerCtx = await getEmployerForUser(user.id);
    if (employerCtx) redirect('/employer');
  }

  const trust = await loadEmployerLandingTrustMetrics();
  const placeholders = getEmployerTrustPlaceholders();
  const placementFee = getEmployerPlacementFeeDisplay();
  const hiringPartnerCtaHref = getEmployerHiringPartnerCtaHref();
  const hiringPartnerCtaExternal = isEmployerHiringPartnerCtaExternal();

  const membersPlacedLabel = formatEmployerTrustStat(
    trust.membersPlaced,
    placeholders.membersPlacedLabel,
    (n) => n.toLocaleString('en-US'),
  );
  const avgWageLabel = formatEmployerTrustStat(
    trust.avgStartingWage,
    placeholders.avgStartingWageLabel,
    formatWage,
  );
  const partnersLabel = formatEmployerTrustStat(
    trust.partnerCompanies,
    placeholders.partnerCompaniesLabel,
    (n) => String(n),
  );
  const hasMembersPlaced = trust.membersPlaced > 0;
  const hasAvgWage = trust.avgStartingWage != null && trust.avgStartingWage > 0;
  const hasPartnerCompanies = trust.partnerCompanies > 0;

  type TrustStatItem = { value: string; label: string };

  const liveTrustStats: TrustStatItem[] = [
    hasMembersPlaced ? { value: membersPlacedLabel, label: t('trustStatPlaced') } : null,
    hasAvgWage ? { value: avgWageLabel, label: t('trustStatWage') } : null,
    hasPartnerCompanies ? { value: partnersLabel, label: t('trustStatPartners') } : null,
  ].filter((item): item is TrustStatItem => item != null);

  const placeholderTrustStats: TrustStatItem[] = [
    { value: t('trustPlaceholderFit'), label: t('trustPlaceholderFitTag') },
    { value: t('trustPlaceholderSkills'), label: t('trustPlaceholderSkillsTag') },
    { value: t('trustPlaceholderTerms'), label: t('trustPlaceholderTermsTag') },
  ];

  const showLogos = trust.logos.length > 0;
  const showVerifiedStats = liveTrustStats.length > 0;
  const showPlaceholderStats = !showLogos && !showVerifiedStats;
  const showLogosOnly = showLogos && !showVerifiedStats;
  const trustStatsToShow = showVerifiedStats ? liveTrustStats : placeholderTrustStats;
  const heroEyebrowIcon = showVerifiedStats ? 'verified' : 'handshake';
  const trustAriaLabel = showPlaceholderStats
    ? t('trustAriaLabelPlaceholder')
    : showVerifiedStats
      ? t('trustAriaLabel')
      : showLogosOnly
        ? t('trustAriaLabelLogosOnly')
        : t('trustAriaLabelPlaceholder');

  return (
    <div className="inner-page employers-landing">
      {/* ── Hero: single primary CTA ── */}
      <HeroSection
        backgroundImage="/images/hero-people.webp"
        priority
        minHeight="min(100vh, 52rem)"
        overlayGradient="linear-gradient(135deg, rgba(18,20,22,0.94) 0%, rgba(18,20,22,0.78) 50%, rgba(173,44,77,0.22) 100%)"
        eyebrow={
          <span className="employers-landing__eyebrow">
            <span className="material-symbols-outlined" aria-hidden="true">
              {heroEyebrowIcon}
            </span>
            {t('heroEyebrow')}
          </span>
        }
        headline={
          <h1 className="employers-landing__headline">
            {t('heroHeadline')}{' '}
            <span className="employers-landing__headline-accent">{t('heroHeadlineAccent')}</span>
          </h1>
        }
        subheadline={
          <p className="employers-landing__subhead">{t('heroSubhead')}</p>
        }
      >
        <div className="employers-landing__hero-cta">
          <EmployersHeroCtaExperiment
            controlLabel={t('primaryCta')}
            variantALabel={t('primaryCtaVariantA')}
            href={hiringPartnerCtaHref}
            external={hiringPartnerCtaExternal}
            onDark
          />
        </div>
      </HeroSection>

      {/* ── Trust strip ── */}
      <section
        className="employers-trust"
        aria-label={trustAriaLabel}
      >
        <div className="container employers-trust__inner">
          {showLogos ? (
            <div className="employers-trust__logos">
              <p className="employers-trust__logos-label">{t('trustLogosLabel')}</p>
              <ul className="employers-trust__logo-list">
                {trust.logos.map((logo) => (
                  <li key={logo.companyName}>
                    {logo.logoUrl ? (
                      <Image
                        src={logo.logoUrl}
                        alt={logo.companyName}
                        width={120}
                        height={40}
                        className="employers-trust__logo-img"
                      />
                    ) : (
                      <span className="employers-trust__logo-text">{logo.companyName}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {showPlaceholderStats ? (
            <p className="employers-trust__placeholder-heading">{t('trustPlaceholderHeading')}</p>
          ) : null}
          {showVerifiedStats || showPlaceholderStats ? (
            <div
              className={`employers-trust__stats${showVerifiedStats ? '' : ' employers-trust__stats--placeholder'}${showLogos ? ' employers-trust__stats--with-logos' : ''}`}
            >
              {trustStatsToShow.map((stat, index) => (
                <div key={stat.label} className="employers-trust__stat-group">
                  {index > 0 ? <div className="employers-trust__stat-divider" aria-hidden="true" /> : null}
                  <div className="employers-trust__stat">
                    <span className="employers-trust__stat-value">{stat.value}</span>
                    <span className="employers-trust__stat-label">{stat.label}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {showVerifiedStats ? (
            <p className="employers-trust__as-of">{trust.asOfLabel}</p>
          ) : (
            <p className="employers-trust__as-of">{t('trustPlaceholderNote')}</p>
          )}
          <p className="employers-trust__impact-link-wrap">
            <LocalizedLink href="/impact" className="employers-trust__impact-link">
              {t('trustImpactLink')}
            </LocalizedLink>
          </p>
        </div>
      </section>

      {/* ── How it works (3 steps) ── */}
      <PageSection padding="lg" className="employers-process">
        <SectionHeader title={t('howTitle')} subtitle={t('howSubtitle')} />
        <div className="employers-process__grid">
          <ProcessStep
            step="1"
            icon="assignment"
            title={t('howStep1Title')}
            description={t('howStep1Desc')}
          />
          <ProcessStep
            step="2"
            icon="school"
            title={t('howStep2Title')}
            description={t('howStep2Desc')}
          />
          <ProcessStep
            step="3"
            icon="person_check"
            title={t('howStep3Title')}
            description={t('howStep3Desc')}
          />
        </div>
      </PageSection>

      {/* ── Outcomes: mini case studies ── */}
      <PageSection padding="lg" className="employers-outcomes">
        <SectionHeader title={t('outcomesTitle')} subtitle={t('outcomesSubtitle')} />
        <div className="employers-outcomes__grid">
          {EMPLOYER_CASE_STUDIES.map((study, i) => (
            <EmployerCaseStudyCard
              key={study.company}
              study={study}
              variant={i === 0 ? 'accent' : 'default'}
              scenarioLabel={t('outcomesScenarioLabel')}
            />
          ))}
        </div>
        {t('outcomesDisclaimer') ? (
          <p className="employers-outcomes__disclaimer">{t('outcomesDisclaimer')}</p>
        ) : null}
      </PageSection>

      {/* ── Pricing: one model ── */}
      <PageSection padding="lg" className="employers-pricing">
        <div className="employers-pricing__card">
          <span className="material-symbols-outlined employers-pricing__icon" aria-hidden="true">
            payments
          </span>
          <h2 className="employers-pricing__title">{t('pricingTitle')}</h2>
          <p className="employers-pricing__lead">{t('pricingLead', { fee: placementFee })}</p>
          <ul className="employers-pricing__list">
            <li>{t('pricingPoint1')}</li>
            <li>{t('pricingPoint2')}</li>
            <li>{t('pricingPoint3')}</li>
          </ul>
          <div className="employers-pricing__partner-plan">
            <p className="employers-pricing__partner-plan-eyebrow">{t('partnerPlanEyebrow')}</p>
            <h3 className="employers-pricing__partner-plan-title">{t('partnerPlanTitle')}</h3>
            <p className="employers-pricing__partner-plan-copy">{t('partnerPlanCopy')}</p>
            <ul className="employers-pricing__partner-plan-list">
              <li>{t('partnerPlanPoint1')}</li>
              <li>{t('partnerPlanPoint2')}</li>
              <li>{t('partnerPlanPoint3')}</li>
            </ul>
          </div>
        </div>
      </PageSection>

      {/* ── FAQ ── */}
      <section className="employers-faq">
        <div className="container employers-faq__inner">
          <SectionHeader title={t('faqTitle')} />
          <div className="faq-list">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <details key={n} className="faq-item">
                <summary>{t(`faq${n}Q` as 'faq1Q')}</summary>
                <p>{t(`faq${n}A` as 'faq1A')}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA (same as hero) ── */}
      <section className="employers-final-cta" aria-label={t('finalCtaAriaLabel')}>
        <div className="container employers-final-cta__inner">
          <h2 className="employers-final-cta__title">{t('finalCtaTitle')}</h2>
          <p className="employers-final-cta__copy">{t('finalCtaCopy')}</p>
          <EmployersHeroCtaExperiment
            controlLabel={t('primaryCta')}
            variantALabel={t('primaryCtaVariantA')}
            href={hiringPartnerCtaHref}
            external={hiringPartnerCtaExternal}
          />
        </div>
      </section>

      {/* ── Intake fallback (no extra CTA buttons) ── */}
      <section id="employer-intake" className="employers-intake" aria-label={t('intakeAriaLabel')}>
        <div className="container employers-intake__inner">
          <h2 className="employers-intake__title">{t('intakeTitle')}</h2>
          <p className="employers-intake__copy">{t('intakeCopy')}</p>
          <EmployerContactForm />
        </div>
      </section>

      <style>{`
        .employers-landing__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.375rem 1rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: var(--glass-blur);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--color-gold);
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .employers-landing__eyebrow .material-symbols-outlined {
          font-size: 0.875rem;
        }
        .employers-landing__headline {
          font-size: clamp(2rem, 6vw, 4.5rem);
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: -0.03em;
          color: var(--color-white);
          max-width: 48rem;
          margin: 0;
        }
        .employers-landing__headline-accent {
          color: var(--color-accent);
        }
        .employers-landing__subhead {
          font-size: clamp(1rem, 2.5vw, 1.25rem);
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.6;
          margin: 0;
        }
        .employers-landing__hero-cta {
          margin-top: 2rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .employers-trust {
          padding: 2rem 0;
          background: var(--surface-container-low);
          border-bottom: 1px solid var(--outline-variant);
        }
        .employers-trust__inner {
          max-width: var(--max-width, 80rem);
          margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2rem);
        }
        .employers-trust__logos-label {
          margin: 0 0 1rem;
          text-align: center;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-on-surface-variant);
        }
        .employers-trust__placeholder-heading {
          margin: 0 0 1rem;
          text-align: center;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-on-surface-variant);
        }
        .employers-trust__logo-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 1.25rem 2rem;
        }
        .employers-trust__logo-img {
          height: auto;
          max-height: 2.5rem;
          width: auto;
          max-width: 7.5rem;
          object-fit: contain;
          filter: grayscale(1);
          opacity: 0.85;
        }
        .employers-trust__logo-text {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--color-on-surface-variant);
        }
        .employers-trust__stats {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 1.25rem;
        }
        .employers-trust__stats--with-logos {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--outline-variant);
        }
        .employers-trust__stat-group {
          display: contents;
        }
        .employers-trust__stat {
          text-align: center;
          padding: 0.5rem 0;
        }
        .employers-trust__stat-value {
          display: block;
          font-size: clamp(1.75rem, 5vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-on-surface);
          line-height: 1.1;
        }
        .employers-trust__stat-label {
          display: block;
          margin-top: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          line-height: 1.4;
        }
        .employers-trust__stat-divider {
          display: none;
        }
        .employers-trust__stats--placeholder .employers-trust__stat-value {
          font-size: clamp(1rem, 3vw, 1.25rem);
          font-weight: 700;
          letter-spacing: 0;
          color: var(--color-on-surface);
          line-height: 1.35;
        }
        .employers-trust__stats--placeholder .employers-trust__stat-label {
          font-size: 0.75rem;
          font-weight: 500;
        }
        .employers-trust__as-of {
          margin: 1.25rem 0 0;
          text-align: center;
          font-size: 0.75rem;
          color: var(--color-on-surface-variant);
          opacity: 0.85;
        }
        .employers-trust__impact-link-wrap {
          margin: 0.75rem 0 0;
          text-align: center;
        }
        .employers-trust__impact-link {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-accent);
          text-decoration: none;
        }
        .employers-trust__impact-link:hover {
          text-decoration: underline;
        }

        .employers-process {
          background: var(--surface-container-lowest);
        }
        .employers-process__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .employers-outcomes {
          background: var(--surface-container-low);
        }
        .employers-outcomes__grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }
        .employers-outcomes__disclaimer {
          margin: 1.25rem 0 0;
          max-width: 42rem;
          font-size: 0.8125rem;
          line-height: 1.6;
          color: var(--color-on-surface-variant);
        }

        .employers-pricing__card {
          max-width: 40rem;
          margin: 0 auto;
          padding: clamp(1.5rem, 4vw, 2.5rem);
          background: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--radius-xl);
          text-align: center;
        }
        .employers-pricing__icon {
          font-size: 2.5rem;
          color: var(--color-accent);
          margin-bottom: 0.75rem;
        }
        .employers-pricing__title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 0.75rem;
          color: var(--color-on-surface);
        }
        .employers-pricing__lead {
          margin: 0 0 1.25rem;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--color-on-surface-variant);
        }
        .employers-pricing__list {
          list-style: none;
          margin: 0;
          padding: 0;
          text-align: left;
          display: grid;
          gap: 0.65rem;
        }
        .employers-pricing__list li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.9375rem;
          line-height: 1.5;
          color: var(--color-on-surface);
        }
        .employers-pricing__list li::before {
          content: 'check_circle';
          font-family: 'Material Symbols Outlined';
          font-size: 1.125rem;
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 0.1rem;
        }
        .employers-pricing__partner-plan {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--outline-variant);
          text-align: left;
        }
        .employers-pricing__partner-plan-eyebrow {
          margin: 0 0 0.4rem;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-accent);
        }
        .employers-pricing__partner-plan-title {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          font-weight: 800;
          color: var(--color-on-surface);
        }
        .employers-pricing__partner-plan-copy {
          margin: 0 0 0.85rem;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: var(--color-on-surface-variant);
        }
        .employers-pricing__partner-plan-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.55rem;
        }
        .employers-pricing__partner-plan-list li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
          color: var(--color-on-surface);
        }
        .employers-pricing__partner-plan-list li::before {
          content: 'arrow_forward';
          font-family: 'Material Symbols Outlined';
          font-size: 1rem;
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 0.05rem;
        }

        .employers-faq {
          padding: clamp(3rem, 6vw, 4.5rem) 0;
          background: var(--surface-container-lowest);
        }
        .employers-faq__inner {
          max-width: var(--max-width, 80rem);
          margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2rem);
        }

        .employers-final-cta {
          padding: clamp(3rem, 6vw, 5rem) 0;
          background: linear-gradient(
            135deg,
            var(--color-accent) 0%,
            var(--color-accent-dark, #8b1c3a) 100%
          );
        }
        .employers-final-cta__inner {
          max-width: 36rem;
          margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2rem);
          text-align: center;
        }
        .employers-final-cta__title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #fff;
          margin: 0 0 0.75rem;
          line-height: 1.1;
        }
        .employers-final-cta__copy {
          margin: 0 0 1.5rem;
          font-size: 1.05rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
        }

        .employers-intake {
          padding: clamp(3rem, 6vw, 5rem) 0;
          background: var(--surface-container-low);
        }
        .employers-intake__inner {
          max-width: 40rem;
          margin: 0 auto;
          padding: 0 clamp(1rem, 4vw, 2rem);
        }
        .employers-intake__title {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 0.75rem;
          color: var(--color-on-surface);
        }
        .employers-intake__copy {
          margin: 0 0 1.5rem;
          font-size: 1rem;
          line-height: 1.6;
          color: var(--color-on-surface-variant);
        }

        @media (min-width: 640px) {
          .employers-trust__stats {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 0;
          }
          .employers-trust__stat-group {
            display: flex;
            flex: 1 1 0;
            align-items: center;
            min-width: 0;
          }
          .employers-trust__stat {
            flex: 1 1 0;
            min-width: 0;
            padding: 0 1rem;
          }
          .employers-trust__stat-divider {
            display: block;
            width: 1px;
            align-self: stretch;
            min-height: 3rem;
            background: var(--outline-variant);
            flex-shrink: 0;
          }
          .employers-outcomes__grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .employers-outcomes__grid .employer-case-study-card:first-child {
            grid-column: 1 / -1;
          }
        }

        @media (min-width: 768px) {
          .employers-process__grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 2.5rem;
          }
        }

        @media (min-width: 1024px) {
          .employers-outcomes__grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .employers-outcomes__grid .employer-case-study-card:first-child {
            grid-column: auto;
          }
        }

        @media (max-width: 639px) {
          .employers-landing__hero-cta .btn,
          .employers-final-cta__inner .btn {
            width: 100%;
            justify-content: center;
          }
          .employers-faq .faq-item summary {
            min-height: 2.75rem;
            display: flex;
            align-items: center;
          }
        }
      `}</style>

      <MobileBottomNav />
      <Footer />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
