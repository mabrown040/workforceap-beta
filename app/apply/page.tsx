import type { Metadata } from 'next';
import { Suspense } from 'react';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ApplyEligibilityClient from './ApplyEligibilityClient';
import ApplyPageSkeleton from './ApplyPageSkeleton';
import ApplyProgramIntro from '@/components/apply/ApplyProgramIntro';
import ApplyRefCapture from '@/components/apply/ApplyRefCapture';
import { buildApplyPageMetadata, getProgramBySlug, resolveApplyProgramSlug } from '@/lib/apply/applyProgramPage';

type PageProps = { searchParams?: Promise<{ program?: string }> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = searchParams ? await searchParams : {};
  return buildApplyPageMetadata(sp.program);
}

/* ─── styles ─── */
const sPage = {
  wrapper: {
    fontFamily: 'var(--font-family)',
    background: 'var(--surface-container-lowest)',
    minHeight: '100vh',
  } as React.CSSProperties,

  hero: {
    padding: 'var(--space-16) var(--space-6) var(--space-8)',
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

  suppRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
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

const STEPS = [
  { label: 'Personal Info', icon: 'person' },
  { label: 'Background', icon: 'work' },
  { label: 'Program Selection', icon: 'school' },
];

export default async function ApplyPage({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : {};
  const programSlug = resolveApplyProgramSlug(sp.program);
  const program = programSlug ? getProgramBySlug(programSlug) : undefined;

  return (
    <div style={sPage.wrapper}>
      {/* ── Hero ── */}
      <section style={sPage.hero}>
        <div style={sPage.heroLabel}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>assured_workload</span>
          Institutional Portal
        </div>
        <h1 style={sPage.heroHeading}>Program Admission</h1>
        <p style={sPage.heroDesc}>
          Answer a few quick questions, choose a program, then create your account so we can follow up with your next steps.
          <strong> No experience required. No cost to qualifying participants.</strong>
        </p>
      </section>

      {/* ── 12-col grid: sidebar + form ── */}
      <div className="apply-grid-layout" style={sPage.grid}>
        {/* Sidebar (4-col) */}
        <aside className="apply-sidebar" style={sPage.sidebar}>
          {/* Progress steps */}
          <div style={sPage.sidebarSteps}>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              Application Progress
            </h3>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {STEPS.map((step, i) => (
                <li key={step.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) 0', borderBottom: i < STEPS.length - 1 ? '1px solid var(--outline-variant)' : 'none' }}>
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
                    <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4, color: i === 0 ? 'var(--color-accent)' : 'var(--color-on-surface-variant)' }}>{step.icon}</span>
                    <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: i === 0 ? 700 : 500, color: i === 0 ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)' }}>{step.label}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Info card */}
          <div style={sPage.infoCard}>
            <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-2)' }}>What happens next?</h4>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', lineHeight: 'var(--line-height-normal)', margin: 0 }}>
              After you apply, a counselor reviews your goals, walks through best-fit program options, and follows up within 24-48 hours.
            </p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
              Questions? Call <a href="tel:5127771808" style={{ color: 'var(--color-gold)', fontWeight: 700 }}>(512) 777-1808</a>
            </p>
          </div>
        </aside>

        {/* Main form area (8-col) */}
        <div style={sPage.mainCard}>
          {program ? <ApplyProgramIntro programSlug={program.slug} /> : null}

          <Suspense fallback={<div style={{ padding: 'var(--space-4)', color: 'var(--color-on-surface-variant)' }}>Loading...</div>}>
            <ApplyRefCapture />
          </Suspense>
          <Suspense fallback={<ApplyPageSkeleton />}>
            <ApplyEligibilityClient />
          </Suspense>
        </div>
      </div>

      {/* ── Supplemental cards ── */}
      <div className="apply-supp-row" style={sPage.suppRow}>
        <div style={sPage.suppCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-green)', flexShrink: 0, marginTop: 2 }}>lock</span>
          <div>
            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-1)' }}>Encrypted Transmission</h4>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', lineHeight: 'var(--line-height-normal)', margin: 0 }}>
              Your data is protected with end-to-end encryption. We never share your personal information with third parties.
            </p>
          </div>
        </div>
        <div style={sPage.suppCard}>
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--color-blue)', flexShrink: 0, marginTop: 2 }}>bolt</span>
          <div>
            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 'var(--space-1)' }}>Rapid Processing</h4>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', lineHeight: 'var(--line-height-normal)', margin: 0 }}>
              Applications are reviewed within 24-48 hours. A counselor will contact you to discuss your best-fit program.
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
          }
          .apply-supp-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <MobileBottomNav />
    </div>
  );
}
