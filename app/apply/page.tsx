import type { Metadata } from 'next';
import LocalizedLink from '@/components/LocalizedLink';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyProgramIntro from '@/components/apply/ApplyProgramIntro';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import UtmCapture from '@/components/marketing/UtmCapture';
import { buildApplyPageMetadata, getProgramBySlug, resolveApplyProgramSlug } from '@/lib/apply/applyProgramPage';
import ApplyFAQSection from '@/components/apply/ApplyFAQSection';
import JsonLdApplyFAQPage from '@/components/JsonLdApplyFAQPage';
import { getTranslations } from 'next-intl/server';

type PageProps = { searchParams?: Promise<{ program?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return await buildApplyPageMetadata(sp.program);
}

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


export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const programSlug = resolveApplyProgramSlug(sp.program);
  const program = programSlug ? getProgramBySlug(programSlug) : undefined;
  const t = await getTranslations('apply');
  return (
    <div style={sPage.wrapper}>
      <JsonLdApplyFAQPage />
      {/* ── Hero ── */}
      <section style={sPage.hero}>
        <div style={sPage.heroLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">assured_workload</span>
          {t('heroLabel')}
        </div>
        <h1 style={sPage.heroHeading}>{t('heroHeading')}</h1>
        <p style={{ ...sPage.heroDesc, marginBottom: 'var(--space-2)' }}>{t('applySocialProof')}</p>
        <p style={sPage.heroDesc}>
          {t('heroDesc')}
          <strong> {t('heroDescHighlight')}</strong>
          <span> {t('heroDescSuffix')}</span>
        </p>
        <div style={sPage.heroFallback}>
          <p style={sPage.heroFallbackTitle}>{t('helpTitle')}</p>
          <p style={sPage.heroFallbackText}>
            {t('helpBody')}
          </p>
          <div style={sPage.heroFallbackActions}>
            <LocalizedLink href="/contact" className="btn btn-outline" style={{ color: 'var(--color-white)', borderColor: 'rgba(255,255,255,0.3)' }}>
              {t('helpCta1')}
            </LocalizedLink>
            <a href="tel:+15127771808" className="btn btn-primary" style={{ background: 'var(--color-gold)', color: 'var(--color-on-surface)' }}>
              {t('helpCta2')}
            </a>
          </div>
        </div>
      </section>

      {/* ── 12-col grid: sidebar + form ── */}
      <div className="apply-grid-layout" style={sPage.grid}>
        {/* Sidebar (4-col) */}
        <aside className="apply-sidebar" aria-label="Application steps" style={sPage.sidebar}>
          {/* Progress steps */}
          <div style={sPage.sidebarSteps}>
            <h2 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              {t('applicationProgress')}
            </h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { labelKey: 'stepPersonalInfo', icon: 'person' },
                { labelKey: 'stepBackground', icon: 'work' },
                { labelKey: 'stepProgramSelection', icon: 'school' },
              ].map((step, i) => (
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

          {/* Info card */}
          <div style={sPage.infoCard}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-2)' }}>{t('whatHappensNext')}</h3>
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
        </aside>

        {/* Main form area (8-col) */}
        <div className="apply-main-form" role="region" aria-label="Application form" style={sPage.mainCard}>
          {program ? <ApplyProgramIntro programSlug={program.slug} /> : null}

          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyRefCapture />
            <UtmCapture />
          </Suspense>

          <div className="apply-foundational-support" role="region" aria-labelledby="apply-docs-checklist-heading">
            <h2 id="apply-docs-checklist-heading" className="apply-foundational-support__title">
              {t('docsChecklistTitle')}
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                lineHeight: 'var(--line-height-normal)',
                color: 'var(--color-gray-700)',
                margin: '0 0 0.65rem',
              }}
            >
              {t('docsChecklistLead')}
            </p>
            <ul className="apply-foundational-support__list">
              <li>{t('docsChecklistItem1')}</li>
              <li>{t('docsChecklistItem2')}</li>
              <li>{t('docsChecklistItem3')}</li>
              <li>{t('docsChecklistItem4')}</li>
            </ul>
            <p
              style={{
                fontSize: '0.9rem',
                lineHeight: 'var(--line-height-normal)',
                color: 'var(--color-gray-700)',
                margin: '0.65rem 0 0',
              }}
            >
              {t('docsChecklistNote')}
            </p>
          </div>

          <noscript
            dangerouslySetInnerHTML={{
              __html: `<div><h2>${t('startYourApplication')}</h2><p>${t('ifFormDoesntLoad')} <a href="tel:+15127771808">(512) 777-1808</a> ${t('orEmail')} <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p></div>`,
            }}
          />

          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyEligibilityClient />
          </Suspense>
        </div>
      </div>

      <ApplyFAQSection />

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

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .apply-grid-layout {
            grid-template-columns: 1fr !important;
          }
          .apply-sidebar {
            position: static !important;
            order: 0;
          }
          .apply-main-form {
            order: 1;
          }
          .apply-supp-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
