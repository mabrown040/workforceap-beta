import '@/css/marketing-v3-employers.css';
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
import { EMPLOYER_CASE_STUDIES } from '@/lib/content/employer-case-studies';
import { loadRealEmployerCaseStudies } from '@/lib/content/employer-case-studies-real';
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

  // Load real case studies from placement records; fall back to placeholders
  const realCaseStudies = await loadRealEmployerCaseStudies();
  const usingVerifiedCaseStudies = realCaseStudies.length > 0;
  const caseStudies = usingVerifiedCaseStudies
    ? realCaseStudies.map((r) => ({
        company: r.company,
        industry: r.industry,
        location: r.location,
        outcome_summary: r.outcome_summary,
        role_filled: r.role_filled,
        quote: r.quote,
        attribution_name: r.attribution_name,
        attribution_title: r.attribution_title,
      }))
    : EMPLOYER_CASE_STUDIES;
  const caseStudyScenarioLabel = usingVerifiedCaseStudies
    ? t('outcomesVerifiedLabel')
    : t('outcomesScenarioLabel');
  const outcomesDisclaimerKey = usingVerifiedCaseStudies
    ? 'outcomesVerifiedDisclaimer'
    : 'outcomesDisclaimer';

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
    { value: t('trustPlaceholderIntro'), label: t('trustPlaceholderIntroTag') },
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
    <div className="wa-v3 inner-page employers-landing">
      {/* ── Bento hero: real next/image photo behind crimson→plum gradient ── */}
      <header className="wa-hero wa-emp-hero">
        <div className="wa-wrap">
          <div className="wa-bento">
            <div className="wa-tile wa-tile--hero">
              <div className="wa-hero-photo" aria-hidden="true">
                <Image
                  src="/images/hero-people.webp"
                  alt=""
                  fill
                  priority
                  fetchPriority="high"
                  sizes="100vw"
                  quality={85}
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>

              <span className="wa-eyebrow wa-emp-eyebrow">
                {heroEyebrowIcon === 'verified' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2l2.4 1.8 3 .2.9 2.9 2.3 1.9-1 2.8 1 2.8-2.3 1.9-.9 2.9-3 .2L12 22l-2.4-1.8-3-.2-.9-2.9L3.4 15l1-2.8-1-2.8 2.3-1.9.9-2.9 3-.2z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 11l3 3L20 6" />
                    <path d="M20 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h7" />
                  </svg>
                )}
                {t('heroEyebrow')}
              </span>

              <h1>
                {t('heroHeadline')}
                <br />
                <span className="wa-accent">{t('heroHeadlineAccent')}</span>
              </h1>
              <p>{t('heroSubhead')}</p>

              <div className="wa-hero-actions">
                <EmployersHeroCtaExperiment
                  controlLabel={t('primaryCta')}
                  variantALabel={t('primaryCtaVariantA')}
                  href={hiringPartnerCtaHref}
                  external={hiringPartnerCtaExternal}
                  onDark
                  className="wa-btn wa-btn--light"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Trust strip ── */}
      <section className="wa-emp-trust" aria-label={trustAriaLabel}>
        <div className="wa-wrap">
          {showLogos ? (
            <>
              <p className="wa-emp-trust__label">
                {showLogosOnly ? t('trustLogosOnlyLabel') : t('trustLogosLabel')}
              </p>
              <ul className="wa-emp-trust__logos">
                {trust.logos.map((logo) => (
                  <li key={logo.companyName}>
                    {logo.logoUrl ? (
                      <Image
                        src={logo.logoUrl}
                        alt={logo.companyName}
                        width={120}
                        height={40}
                        className="wa-emp-trust__logo-img"
                      />
                    ) : (
                      <span className="wa-emp-trust__logo-text">{logo.companyName}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {showPlaceholderStats ? (
            <p className="wa-emp-trust__label">{t('trustPlaceholderHeading')}</p>
          ) : null}
          {showVerifiedStats || showPlaceholderStats ? (
            <div
              className={`wa-emp-trust__stats${showVerifiedStats ? '' : ' wa-emp-trust__stats--placeholder'}${showLogos ? ' wa-emp-trust__stats--with-logos' : ''}`}
            >
              {trustStatsToShow.map((stat) => (
                <div key={stat.label} className="wa-emp-trust__stat">
                  <span className="wa-emp-trust__stat-value">{stat.value}</span>
                  <span className="wa-emp-trust__stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          {showVerifiedStats ? (
            <>
              <p className="wa-emp-trust__asof">{trust.asOfLabel}</p>
              <p className="wa-emp-trust__note">{t('trustVerifiedNote')}</p>
            </>
          ) : (
            <p className="wa-emp-trust__asof">
              {showLogosOnly ? t('trustLogosOnlyNote') : t('trustPlaceholderNote')}
            </p>
          )}
          <p className="wa-emp-trust__impact">
            <LocalizedLink href="/impact">{t('trustImpactLink')}</LocalizedLink>
          </p>
        </div>
      </section>

      {/* ── How it works (3 steps) ── */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('howTitle')}</span>
            <h2>{t('howTitle')}</h2>
            <p>{t('howSubtitle')}</p>
          </div>
          <div className="wa-steps">
            <div className="wa-step">
              <div className="wa-n">1</div>
              <h3>{t('howStep1Title')}</h3>
              <p>{t('howStep1Desc')}</p>
            </div>
            <div className="wa-step">
              <div className="wa-n">2</div>
              <h3>{t('howStep2Title')}</h3>
              <p>{t('howStep2Desc')}</p>
            </div>
            <div className="wa-step">
              <div className="wa-n">3</div>
              <h3>{t('howStep3Title')}</h3>
              <p>{t('howStep3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Outcomes: mini case studies ── */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">
              {usingVerifiedCaseStudies ? t('outcomesTitleVerified') : t('outcomesTitle')}
            </span>
            <h2>{usingVerifiedCaseStudies ? t('outcomesTitleVerified') : t('outcomesTitle')}</h2>
            <p>{usingVerifiedCaseStudies ? t('outcomesSubtitleVerified') : t('outcomesSubtitle')}</p>
          </div>
          <div className="wa-emp-outcomes__grid">
            {caseStudies.map((study, i) => (
              <EmployerCaseStudyCard
                key={study.company}
                study={study}
                variant={i === 0 ? 'accent' : 'default'}
                scenarioLabel={caseStudyScenarioLabel}
              />
            ))}
          </div>
          {t(outcomesDisclaimerKey) ? (
            <p className="wa-emp-outcomes__disclaimer">{t(outcomesDisclaimerKey)}</p>
          ) : null}
        </div>
      </section>

      {/* ── Pricing: one model ── */}
      <section className="wa-band">
        <div className="wa-wrap">
          <div className="wa-emp-pricing__card">
            <div className="wa-emp-pricing__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M14.5 9.5a2.5 2.5 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.9 2.5 2-1.1 2-2.5 2a2.5 2.5 0 0 1-2.5-1.5" />
                <path d="M12 6.5V8M12 16v1.5" />
              </svg>
            </div>
            <h2 className="wa-emp-pricing__title">{t('pricingTitle')}</h2>
            <p className="wa-emp-pricing__lead">{t('pricingLead', { fee: placementFee })}</p>
            <ul className="wa-emp-pricing__list">
              {[t('pricingPoint1'), t('pricingPoint2'), t('pricingPoint3')].map((point) => (
                <li key={point}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
                  </svg>
                  {point}
                </li>
              ))}
            </ul>
            <div className="wa-emp-pricing__partner">
              <p className="wa-emp-pricing__partner-eyebrow">{t('partnerPlanEyebrow')}</p>
              <h3 className="wa-emp-pricing__partner-title">{t('partnerPlanTitle')}</h3>
              <p className="wa-emp-pricing__partner-copy">{t('partnerPlanCopy', { fee: placementFee })}</p>
              <ul className="wa-emp-pricing__partner-list">
                {[t('partnerPlanPoint1'), t('partnerPlanPoint2'), t('partnerPlanPoint3')].map((point) => (
                  <li key={point}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="M13 6l6 6-6 6" />
                    </svg>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wa-band wa-band--surface">
        <div className="wa-wrap">
          <div className="wa-sec-head">
            <span className="wa-eyebrow">{t('faqTitle')}</span>
            <h2>{t('faqTitle')}</h2>
          </div>
          <div className="wa-emp-faq">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <details key={n}>
                <summary>
                  {t(`faq${n}Q` as 'faq1Q')}
                  <svg className="wa-emp-faq__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </summary>
                <p>{t(`faq${n}A` as 'faq1A')}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA (same as hero) ── */}
      <section className="wa-band" aria-label={t('finalCtaAriaLabel')}>
        <div className="wa-wrap">
          <div className="wa-cta wa-emp-cta">
            <h2>{t('finalCtaTitle')}</h2>
            <p>{t('finalCtaCopy')}</p>
            <div className="wa-acts">
              <EmployersHeroCtaExperiment
                controlLabel={t('primaryCta')}
                variantALabel={t('primaryCtaVariantA')}
                href={hiringPartnerCtaHref}
                external={hiringPartnerCtaExternal}
                className="wa-btn wa-btn--light"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Intake fallback (no extra CTA buttons) ── */}
      <section id="employer-intake" className="wa-band wa-band--surface" aria-label={t('intakeAriaLabel')}>
        <div className="wa-wrap">
          <div className="wa-emp-intake__inner">
            <h2 className="wa-emp-intake__title">{t('intakeTitle')}</h2>
            <p className="wa-emp-intake__copy">{t('intakeCopy')}</p>
            <EmployerContactForm />
          </div>
        </div>
      </section>

      <MobileBottomNav />
      <Footer />
      <div className="mobile-bottom-nav-spacer" aria-hidden="true" />
    </div>
  );
}
