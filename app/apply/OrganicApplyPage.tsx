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

/* ─── styles ─── */
const sPage = {
  wrapper: {
    fontFamily: 'var(--font-family)',
    background: 'var(--surface-container-lowest)',
    minHeight: '100vh',
  } as React.CSSProperties,

  hero: {
    padding: 'calc(var(--nav-height-default, 80px) + var(--space-8)) var(--space-6) var(--space-8)',
    textAlign: 'center' as const,
    background: 'linear-gradient(170deg, var(--color-primary) 0%, #2a0a14 60%, var(--color-accent-dark) 100%)',
    color: 'var(--color-white)',
  } as React.CSSProperties,

  heroLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-1) var(--space-3)',
    borderRadius: 'var(--radius-xl)',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    marginBottom: 'var(--space-4)',
  } as React.CSSProperties,

  heroHeading: {
    fontSize: 'clamp(2rem, 5vw, 2.75rem)',
    fontWeight: 800,
    marginBottom: 'var(--space-4)',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  heroDesc: {
    fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
    lineHeight: 'var(--line-height-normal)',
    maxWidth: 640,
    margin: '0 auto',
    opacity: 0.85,
  } as React.CSSProperties,

  heroFallback: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    margin: 'var(--space-6) auto 0',
    padding: 'var(--space-4) var(--space-5)',
    maxWidth: 640,
    borderRadius: 'var(--radius-lg)',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.14)',
    textAlign: 'left' as const,
  } as React.CSSProperties,

  heroFallbackTitle: {
    fontSize: 'var(--font-size-sm)',
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.85)',
    margin: 0,
  } as React.CSSProperties,

  heroFallbackText: {
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-normal)',
    color: 'rgba(255,255,255,0.86)',
    margin: 0,
  } as React.CSSProperties,

  heroFallbackActions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-3)',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: 'var(--space-6)',
    maxWidth: 'var(--max-width)',
    margin: '0 auto',
    padding: 'var(--space-8) var(--space-6)',
  } as React.CSSProperties,

  sidebar: {
    position: 'sticky' as const,
    top: 'var(--space-6)',
    alignSelf: 'start' as const,
  } as React.CSSProperties,

  sidebarSteps: {
    background: 'var(--surface-container)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    marginBottom: 'var(--space-4)',
  } as React.CSSProperties,

  infoCard: {
    background: 'var(--surface-container)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-6)',
    border: '1px solid var(--outline-variant)',
  } as React.CSSProperties,

  mainCard: {
    background: 'var(--surface-container-low)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-8)',
    border: '1px solid var(--outline-variant)',
  } as React.CSSProperties,

  ssrFallback: {
    padding: 'var(--space-6)',
    background: 'var(--surface-container)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--outline-variant)',
    marginBottom: 'var(--space-6)',
  } as React.CSSProperties,

  ssrFallbackHeading: {
    fontSize: 'var(--font-size-xl)',
    fontWeight: 700,
    color: 'var(--color-on-surface)',
    marginBottom: 'var(--space-3)',
  } as React.CSSProperties,

  ssrFallbackText: {
    fontSize: 'var(--font-size-base)',
    color: 'var(--color-on-surface-variant)',
    lineHeight: 'var(--line-height-normal)',
    margin: 0,
  } as React.CSSProperties,

  suppRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 'var(--space-4)',
    maxWidth: 'var(--max-width)',
    margin: '0 auto var(--space-8)',
    padding: '0 var(--space-6)',
  } as React.CSSProperties,

  suppCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--space-3)',
    padding: 'var(--space-6)',
    background: 'var(--surface-container)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--outline-variant)',
  } as React.CSSProperties,
};


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
    <div className="apply-hero-help-card" style={sPage.heroFallback}>
      <p style={sPage.heroFallbackTitle}>{t('helpTitle')}</p>
      <p style={sPage.heroFallbackText}>{t('helpBody')}</p>
      <div style={sPage.heroFallbackActions}>
        <LocalizedLink href="/contact" className="btn btn-outline" style={{ color: 'var(--color-white)', borderColor: 'rgba(255,255,255,0.3)' }}>
          {t('helpCta1')}
        </LocalizedLink>
        <a href="tel:+15127771808" className="btn btn-primary" style={{ background: 'var(--color-gold)', color: 'var(--color-on-surface)' }}>
          {t('helpCta2')}
        </a>
      </div>
    </div>
  );

  return (
    <div className="apply-page-organic" style={sPage.wrapper}>
      {/* ── Hero ── */}
      <section className="apply-hero" style={sPage.hero}>
        <div style={sPage.heroLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">assured_workload</span>
          {t('heroLabel')}
        </div>
        <h1 style={sPage.heroHeading}>{t('heroHeading')}</h1>
        <p className="apply-hero-social" style={{ ...sPage.heroDesc, marginBottom: 'var(--space-2)' }}>{t('applySocialProof')}</p>
        <p className="apply-hero-time-callout apply-hero-time-mobile">{t('step1Kicker')}</p>
        {/* Pilot status — honest about limited availability */}
        <div style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <PreLaunchTag compact />
        </div>
        <p className="apply-hero-desc-full" style={sPage.heroDesc}>
          {t('heroDesc')}
          <strong> {t('heroDescHighlight')}</strong>
          <span> {t('heroDescSuffix')}</span>
        </p>
        <p className="apply-hero-help-compact">
          {t('questionsCall')}{' '}
          <a href="tel:+15127771808" className="apply-hero-help-compact__link">(512) 777-1808</a>
        </p>
        <a href="#apply-form-start" className="btn btn-primary apply-hero-start-cta">
          {t('startYourApplication')}
        </a>
        <div className="apply-hero-help-desktop">{helpCard}</div>
      </section>

      {/* ── 12-col grid: sidebar + form ── */}
      <div className="apply-grid-layout" style={sPage.grid}>
        {/* Sidebar (4-col) */}
        <aside className="apply-sidebar" aria-label="Application steps" style={sPage.sidebar}>
          {/* Progress steps */}
          <div className="apply-sidebar-progress" style={sPage.sidebarSteps}>
            <h2 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              {t('applicationProgress')}
            </h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {APPLY_PROGRESS_STEPS.map((step, i) => (
                <li key={step.labelKey} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: i < 2 ? '1px solid var(--outline-variant)' : 'none' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--color-accent)' : 'var(--surface-container-highest)',
                    color: i === 0 ? 'var(--color-white)' : 'var(--color-on-surface-variant)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4, color: i === 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }} aria-hidden="true">{step.icon}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{t(step.labelKey as Parameters<typeof t>[0])}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Info card — collapsible on mobile to reduce post-form scroll */}
          <details className="apply-sidebar-next-steps" style={sPage.infoCard}>
            <summary className="apply-sidebar-next-steps__summary">{t('whatHappensNext')}</summary>
            <div className="apply-sidebar-next-steps__body">
              <h3 className="apply-sidebar-next-steps__heading">{t('whatHappensNext')}</h3>
              <ol style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-size-sm)', lineHeight: 'var(--line-height-normal)' }}>
                <li>{t('nextStep1')}</li>
                <li>{t('nextStep2')}</li>
                <li>{t('nextStep3')}</li>
                <li>{t('nextStep4')}</li>
                <li>{t('nextStep5')}</li>
              </ol>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
                {t('questionsCall')} <a href="tel:+15127771808" style={{ color: 'var(--color-gold)', fontWeight: 700 }}>(512) 777-1808</a>
              </p>
            </div>
          </details>
        </aside>

        {/* Main form area (8-col) */}
        <div className="apply-main-form" role="region" aria-label="Application form" style={sPage.mainCard}>
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
            <ApplyMobileStepNav activeStep={0} />
            <ApplyMobileTrustBar />
            <TrustStrip variant="apply" />

            <Suspense fallback={<ApplyPageSkeleton />}>
              <ApplyEligibilityClient />
            </Suspense>
          </div>
          <details className="apply-docs-checklist apply-foundational-support" role="region" aria-labelledby="apply-docs-checklist-heading">
            <summary className="apply-docs-checklist__summary">{t('docsChecklistSummary')}</summary>
            <div className="apply-docs-checklist__body">
              <h2 id="apply-docs-checklist-heading" className="apply-foundational-support__title apply-docs-checklist__heading">
                {t('docsChecklistTitle')}
              </h2>
              <p className="apply-docs-checklist__lead">{t('docsChecklistLead')}</p>
              <ul className="apply-foundational-support__list">
                <li>{t('docsChecklistItem1')}</li>
                <li>{t('docsChecklistItem2')}</li>
                <li>{t('docsChecklistItem3')}</li>
                <li>{t('docsChecklistItem4')}</li>
              </ul>
              <p className="apply-docs-checklist__note">{t('docsChecklistNote')}</p>
            </div>
          </details>
        </div>

        <div className="apply-hero-help-mobile" aria-label={t('helpTitle')}>
          {helpCard}
        </div>
      </div>

      {/* ── Supplemental cards ── */}
      <div className="apply-supp-row" role="region" aria-label="Program information" style={sPage.suppRow}>
        <div style={sPage.suppCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-green)', flexShrink: 0, marginTop: 2 }} aria-hidden="true">lock</span>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-1)' }}>{t('suppCard1Title')}</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', lineHeight: 'var(--line-height-normal)', margin: 0 }}>
              {t('suppCard1Body')} <LocalizedLink href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>{t('privacyPolicy')}</LocalizedLink>.
            </p>
          </div>
        </div>
        <div style={sPage.suppCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-blue)', flexShrink: 0, marginTop: 2 }} aria-hidden="true">bolt</span>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-1)' }}>{t('suppCard2Title')}</h3>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', lineHeight: 'var(--line-height-normal)', margin: 0 }}>
              {t('suppCard2Body')}
            </p>
          </div>
        </div>
      </div>

      <Footer />
      <ApplyOrganicStickyCta />

      {/* Responsive overrides — mobile: shorter hero, form first, help below form */}
      <style>{`
        .apply-docs-checklist__lead,
        .apply-docs-checklist__note {
          font-size: var(--font-size-sm);
          line-height: var(--line-height-normal);
          color: var(--color-on-surface-variant);
          margin: 0 0 var(--space-3);
        }

        .apply-docs-checklist__note {
          margin: var(--space-3) 0 0;
        }

        .apply-hero-time-mobile,
        .apply-hero-help-compact,
        .apply-hero-start-cta,
        .apply-hero-help-mobile {
          display: none;
        }

        .apply-hero-time-mobile {
          max-width: 640px;
          margin: var(--space-3) auto 0;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.08);
          font-size: var(--font-size-sm);
          line-height: var(--line-height-normal);
          color: rgba(255, 255, 255, 0.88);
          text-align: center;
        }

        .apply-hero-help-compact {
          margin: var(--space-4) auto 0;
          max-width: 640px;
          font-size: var(--font-size-sm);
          line-height: var(--line-height-normal);
          color: rgba(255, 255, 255, 0.88);
        }

        .apply-hero-help-compact__link {
          color: var(--color-gold);
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .apply-hero-start-cta {
          margin: var(--space-5) auto 0;
          min-width: min(100%, 320px);
          min-height: 48px;
          background: var(--color-gold);
          color: var(--color-on-surface);
          font-weight: 700;
        }

        .apply-hero-help-mobile {
          max-width: var(--max-width);
          margin: 0 auto var(--space-6);
          padding: 0 var(--space-4);
        }

        .apply-hero-help-mobile .apply-hero-help-card {
          background: var(--surface-container);
          border-color: var(--outline-variant);
          color: var(--color-on-surface);
        }

        .apply-hero-help-mobile .apply-hero-help-card p:first-of-type {
          color: var(--color-on-surface);
        }

        .apply-hero-help-mobile .apply-hero-help-card p:nth-of-type(2) {
          color: var(--color-on-surface-variant);
        }

        .apply-hero-help-mobile .apply-hero-help-card .btn-outline {
          color: var(--color-on-surface) !important;
          border-color: var(--outline-variant) !important;
        }

        @media (min-width: 769px) {
          .apply-docs-checklist__summary {
            display: none;
          }
          .apply-docs-checklist__body {
            display: block;
            margin-top: 0;
          }

          .apply-sidebar-next-steps__summary {
            display: none;
          }
          .apply-sidebar-next-steps__heading {
            font-size: var(--font-size-sm);
            font-weight: 700;
            color: var(--color-on-surface);
            margin: 0 0 var(--space-2);
          }
          .apply-sidebar-next-steps__body {
            display: block;
            margin-top: 0;
          }
        }

        .apply-organic-sticky-cta {
          display: none;
        }

        @media (max-width: 768px) {
          .apply-page-organic {
            padding-bottom: calc(var(--space-8) + 4.5rem + env(safe-area-inset-bottom, 0px));
          }

          .apply-organic-sticky-cta {
            display: block;
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

          html.dark .apply-organic-sticky-cta {
            background: rgba(28, 27, 31, 0.96);
          }

          .apply-organic-sticky-cta__button {
            width: 100%;
            max-width: var(--max-width);
            margin: 0 auto;
            display: flex;
            min-height: 48px;
            background: var(--color-gold);
            color: var(--color-on-surface);
            font-weight: 700;
          }

          .apply-flow--step1:not(.apply-flow--paid) .apply-progress-bar,
          .apply-flow--step1:not(.apply-flow--paid) .apply-step-kicker {
            display: none;
          }

          .apply-flow--step1:not(.apply-flow--paid) .apply-step1-actions {
            scroll-margin-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
          }

          .apply-hero {
            padding: calc(var(--nav-height-default, 80px) + var(--space-5)) var(--space-4) var(--space-5) !important;
          }
          /* Vague social proof repeats below the fold — keep hero scannable on small screens */
          .apply-hero-social {
            display: none !important;
          }
          .apply-hero-desc-full,
          .apply-hero-help-desktop {
            display: none !important;
          }
          .apply-hero-time-mobile,
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
          .apply-grid-layout {
            grid-template-columns: 1fr !important;
            padding: var(--space-6) var(--space-4) !important;
            gap: var(--space-4) !important;
          }
          .apply-main-form {
            order: -1;
            padding: var(--space-5) var(--space-4) !important;
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
          .apply-docs-checklist__summary {
            display: list-item;
            cursor: pointer;
            font-size: var(--font-size-sm);
            font-weight: 700;
            color: var(--color-on-surface);
            min-height: 44px;
            padding: var(--space-1) 0;
            list-style-position: outside;
          }
          .apply-docs-checklist__summary::-webkit-details-marker {
            color: var(--color-green);
          }
          .apply-docs-checklist__heading {
            display: none;
          }
          .apply-docs-checklist__body {
            margin-top: var(--space-2);
          }
          .apply-program-intro {
            order: 0;
          }
          .apply-hero-help-mobile {
            order: 0;
          }
          .apply-sidebar {
            position: static !important;
            order: 1;
          }
          .apply-sidebar-progress {
            display: none;
          }
          .apply-sidebar-next-steps__summary {
            display: list-item;
            cursor: pointer;
            font-size: var(--font-size-sm);
            font-weight: 700;
            color: var(--color-on-surface);
            min-height: 44px;
            padding: var(--space-1) 0;
            list-style-position: outside;
          }
          .apply-sidebar-next-steps__summary::-webkit-details-marker {
            color: var(--color-accent);
          }
          .apply-sidebar-next-steps__heading {
            display: none;
          }
          .apply-sidebar-next-steps__body {
            margin-top: var(--space-2);
          }
          .apply-supp-row > div:nth-child(2) {
            display: none;
          }
          .apply-supp-row {
            grid-template-columns: 1fr !important;
            padding-inline: var(--space-4) !important;
          }
          /* Hero already shows social proof — avoid duplicate above the form */
          .apply-flow--step1:not(.apply-flow--paid) .apply-social-proof {
            display: none;
          }
          /* Sidebar covers next steps — keep step 1 form scannable */
          .apply-flow--step1:not(.apply-flow--paid) .apply-transition-card {
            display: none;
          }
          #apply-form-start {
            scroll-margin-top: calc(var(--nav-height-default, 80px) + var(--space-4));
          }
        }
      `}</style>
    </div>
  );
}
