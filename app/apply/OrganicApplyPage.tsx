import LocalizedLink from '@/components/LocalizedLink';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyProgramIntro from '@/components/apply/ApplyProgramIntro';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import UtmCapture from '@/components/marketing/UtmCapture';
import { getProgramBySlug, resolveApplyProgramSlug } from '@/lib/apply/applyProgramPage';
import { getTranslations } from 'next-intl/server';
import ApplyMobileStepNav from '@/components/apply/ApplyMobileStepNav';
import ApplyMobileTrustBar from '@/components/apply/ApplyMobileTrustBar';
import ApplyOrganicStickyCta from '@/components/apply/ApplyOrganicStickyCta';
import TrustStrip from '@/components/marketing/TrustStrip';
import PreLaunchTag from '@/components/portal/PreLaunchTag';

type OrganicApplyPageProps = { program?: string };

/* ── inline blend icons (no emoji) ── */
const ICON_SHIELD = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const STEP_ICONS = {
  person: (
    <svg className="wa-pic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  work: (
    <svg className="wa-pic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  school: (
    <svg className="wa-pic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 10L12 5 2 10l10 5 10-5z" />
      <path d="M6 12v5c0 1 2.7 3 6 3s6-2 6-3v-5" />
    </svg>
  ),
} as const;

const ICON_LOCK = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

const ICON_BOLT = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
  </svg>
);

const APPLY_PROGRESS_STEPS = [
  { labelKey: 'stepPersonalInfo', icon: 'person' },
  { labelKey: 'stepBackground', icon: 'work' },
  { labelKey: 'stepProgramSelection', icon: 'school' },
] as const;

export default async function OrganicApplyPage({ program: programParam }: OrganicApplyPageProps) {
  const programSlug = resolveApplyProgramSlug(programParam);
  const program = programSlug ? getProgramBySlug(programSlug) : undefined;
  const t = await getTranslations('apply');

  const helpCard = (
    <div className="wa-help-card apply-hero-help-card">
      <p className="wa-ht">{t('helpTitle')}</p>
      <p className="wa-hb">{t('helpBody')}</p>
      <div className="wa-ha">
        <LocalizedLink href="/contact" className="wa-btn wa-btn--outline">
          {t('helpCta1')}
        </LocalizedLink>
        <a href="tel:+15127771808" className="wa-btn wa-btn--gold">
          {t('helpCta2')}
        </a>
      </div>
    </div>
  );

  return (
    <div className="wa-v3 wa-apply-page apply-page-organic">
      {/* ── Hero ── */}
      <section className="wa-apply-hero apply-hero">
        <div className="wa-apply-hero__inner">
          <span className="wa-hero-label">
            {ICON_SHIELD}
            {t('heroLabel')}
          </span>
          <h1>{t('heroHeading')}</h1>
          <p className="wa-hero-social apply-hero-social">{t('applySocialProof')}</p>
          {/* Pilot status — honest about limited availability */}
          <div className="wa-hero-pilot">
            <PreLaunchTag compact />
          </div>
          <p className="wa-hero-desc apply-hero-desc-full">
            {t('heroDesc')}
            <strong> {t('heroDescHighlight')}</strong>
            <span> {t('heroDescSuffix')}</span>
          </p>
          <p className="wa-hero-help-compact apply-hero-help-compact">
            {t('questionsCall')}{' '}
            <a href="tel:+15127771808">(512) 777-1808</a>
          </p>
          <a href="#apply-form-start" className="wa-btn wa-btn--gold wa-hero-start-cta apply-hero-start-cta">
            {t('startYourApplication')}
          </a>
          <div className="apply-hero-help-desktop">{helpCard}</div>
        </div>
      </section>

      {/* ── grid: sidebar + form ── */}
      <div className="wa-apply-grid apply-grid-layout">
        {/* Sidebar */}
        <aside className="wa-apply-sidebar apply-sidebar" aria-label="Application steps">
          {/* Progress steps */}
          <div className="wa-side-card wa-prog-card apply-sidebar-progress">
            <h2>{t('applicationProgress')}</h2>
            <ol className="wa-prog-list">
              {APPLY_PROGRESS_STEPS.map((step, i) => (
                <li key={step.labelKey} className={i === 0 ? 'is-active' : undefined}>
                  <span className="wa-prog-num">{i + 1}</span>
                  <span className="wa-prog-lbl">
                    {STEP_ICONS[step.icon]}
                    {t(step.labelKey as Parameters<typeof t>[0])}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Next steps — collapsible on mobile */}
          <details className="wa-side-card wa-next-card apply-sidebar-next-steps" open>
            <summary className="apply-sidebar-next-steps__summary">{t('whatHappensNext')}</summary>
            <div className="wa-next-card__body apply-sidebar-next-steps__body">
              <h3 className="apply-sidebar-next-steps__heading">{t('whatHappensNext')}</h3>
              <ol>
                <li>{t('nextStep1')}</li>
                <li>{t('nextStep2')}</li>
                <li>{t('nextStep3')}</li>
                <li>{t('nextStep4')}</li>
                <li>{t('nextStep5')}</li>
              </ol>
              <p className="wa-next-card__call">
                {t('questionsCall')} <a href="tel:+15127771808">(512) 777-1808</a>
              </p>
            </div>
          </details>
        </aside>

        {/* Main form area */}
        <div className="wa-main-form apply-main-form" role="region" aria-label="Application form">
          {program ? <ApplyProgramIntro programSlug={program.slug} /> : null}

          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyRefCapture />
            <UtmCapture />
          </Suspense>

          <noscript
            dangerouslySetInnerHTML={{
              __html: `<div><h2>${t('startYourApplication')}</h2><p>${t('ifFormDoesntLoad')} <a href="tel:+15127771808">(512) 777-1808</a> ${t('orEmail')} <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p></div>`,
            }}
          />

          <div id="apply-form-start" className="apply-main-form__primary">
            <ApplyMobileTrustBar />
            <ApplyMobileStepNav activeStep={0} showTimeHint />
            <p className="wa-form-kicker apply-organic-form-kicker" role="note">
              {t('step1Kicker')}
            </p>
            <TrustStrip variant="apply" />

            <Suspense fallback={<ApplyPageSkeleton />}>
              <ApplyEligibilityClient />
            </Suspense>
          </div>

          <details className="wa-docs apply-docs-checklist apply-foundational-support" role="region" aria-labelledby="apply-docs-checklist-heading">
            <summary className="apply-docs-checklist__summary">{t('docsChecklistSummary')}</summary>
            <div className="wa-docs__body apply-docs-checklist__body">
              <h2 id="apply-docs-checklist-heading" className="apply-foundational-support__title apply-docs-checklist__heading">
                {t('docsChecklistTitle')}
              </h2>
              <p className="wa-docs__lead apply-docs-checklist__lead">{t('docsChecklistLead')}</p>
              <ul className="apply-foundational-support__list">
                <li>{t('docsChecklistItem1')}</li>
                <li>{t('docsChecklistItem2')}</li>
                <li>{t('docsChecklistItem3')}</li>
                <li>{t('docsChecklistItem4')}</li>
              </ul>
              <p className="wa-docs__note apply-docs-checklist__note">{t('docsChecklistNote')}</p>
            </div>
          </details>
        </div>

        <div className="apply-hero-help-mobile" aria-label={t('helpTitle')}>
          {helpCard}
        </div>
      </div>

      {/* ── Supplemental cards ── */}
      <div className="wa-supp-row apply-supp-row" role="region" aria-label="Program information">
        <div className="wa-supp-card">
          <span className="wa-sic wa-sic--accent">{ICON_LOCK}</span>
          <div>
            <h3>{t('suppCard1Title')}</h3>
            <p>
              {t('suppCard1Body')}{' '}
              <LocalizedLink href="/privacy">{t('privacyPolicy')}</LocalizedLink>.
            </p>
          </div>
        </div>
        <div className="wa-supp-card">
          <span className="wa-sic wa-sic--info">{ICON_BOLT}</span>
          <div>
            <h3>{t('suppCard2Title')}</h3>
            <p>{t('suppCard2Body')}</p>
          </div>
        </div>
      </div>

      <Footer />
      <ApplyOrganicStickyCta />

      {/* Responsive overrides — mobile: shorter hero, form first, help below form */}
      <style>{`
        .apply-hero-help-compact,
        .apply-hero-start-cta,
        .apply-hero-help-mobile {
          display: none;
        }

        .apply-hero-help-mobile {
          max-width: var(--wa-max);
          margin: 0 auto var(--space-6);
          padding: 0 var(--space-4);
        }

        .apply-hero-help-mobile .apply-hero-help-card {
          background: var(--wa-surface);
          border-color: var(--wa-border);
          color: var(--wa-text);
        }

        .apply-hero-help-mobile .apply-hero-help-card .wa-ht {
          color: var(--wa-text);
        }

        .apply-hero-help-mobile .apply-hero-help-card .wa-hb {
          color: var(--wa-muted);
        }

        .apply-hero-help-mobile .apply-hero-help-card .wa-btn--outline {
          color: var(--wa-text);
          border-color: var(--wa-border);
        }

        @media (min-width: 769px) {
          .apply-docs-checklist__summary,
          .apply-sidebar-next-steps__summary {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .apply-hero-desc-full,
          .apply-hero-help-desktop {
            display: none !important;
          }
          .apply-hero-help-compact,
          .apply-hero-start-cta,
          .apply-hero-help-mobile {
            display: block;
          }
          .apply-hero-start-cta {
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }
          .apply-main-form {
            order: -1;
            display: flex;
            flex-direction: column;
          }
          .apply-main-form__primary {
            order: 1;
          }
          .apply-foundational-support,
          .apply-docs-checklist {
            order: 2;
            margin-top: var(--space-4);
            margin-bottom: 0;
          }
          .apply-program-intro {
            order: 0;
          }
          .apply-hero-help-mobile {
            order: 0;
          }
          /* Hero already shows social proof — avoid duplicate above the form */
          .apply-flow--step1:not(.apply-flow--paid) .apply-social-proof {
            display: none;
          }
          /* Sidebar covers next steps — keep step 1 form scannable */
          .apply-flow--step1:not(.apply-flow--paid) .apply-transition-card {
            display: none;
          }
          .apply-flow--step1:not(.apply-flow--paid) .apply-progress-bar,
          .apply-flow--step1:not(.apply-flow--paid) .apply-step-kicker {
            display: none;
          }
          .apply-flow--step1:not(.apply-flow--paid) .apply-step1-actions {
            scroll-margin-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
          }
          #apply-form-start {
            scroll-margin-top: calc(var(--nav-height-default, 80px) + var(--space-4));
          }
        }
      `}</style>
    </div>
  );
}
