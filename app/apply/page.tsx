import type { Metadata } from 'next';
import Link from 'next/link';
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

      {/* ══════════════════════════════════════════════
          MOBILE LAYOUT ≤640px — Stitch-aligned
          ══════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col items-center" style={{ background: '#fcf9f8', minHeight: '100vh', paddingBottom: '5rem' }}>
        {/* Header */}
        <header className="fixed top-0 w-full z-50 px-5 flex justify-between items-center h-16" style={{ background: 'rgba(252,249,248,0.88)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(222,191,194,0.2)' }}>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center" aria-label="Back to home">
              <span className="material-symbols-outlined" style={{ color: '#ad2c4d' }}>arrow_back</span>
            </Link>
            <span className="text-lg font-black tracking-tight" style={{ color: '#ad2c4d' }}>WorkforceAP</span>
          </div>
        </header>

        <main className="w-full max-w-[390px] px-5 pt-24 pb-10 flex flex-col gap-7">
          {/* Hero intro */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#ad2c4d' }}>
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1c1b1b' }}>Program Admission</h1>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#584144' }}>
              Answer a few quick questions then choose a program. No experience required. No cost to qualifying participants.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full self-start" style={{ background: '#ebe7e7' }}>
              <span className="material-symbols-outlined text-sm" style={{ color: '#584144' }}>timer</span>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#584144' }}>About 10 minutes</span>
            </div>
          </section>

          {/* 3-Step Mini-Flow Indicator */}
          <nav className="flex justify-between items-start relative py-3">
            <div className="absolute top-7 left-0 w-full h-0.5" style={{ background: '#e5e2e1', zIndex: 0 }} />
            {[
              { n: 1, label: 'Check Fit', active: true },
              { n: 2, label: 'Pick Program', active: false },
              { n: 3, label: 'Create Account', active: false },
            ].map(({ n, label, active }) => (
              <div key={n} className="flex flex-col items-center gap-1.5 z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={active ? { background: '#ad2c4d', color: '#fff' } : { background: '#e5e2e1', color: '#584144' }}>
                  {n}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: active ? '#ad2c4d' : '#584144' }}>{label}</span>
              </div>
            ))}
          </nav>

          {/* Progress Bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-end">
              <span className="text-[11px] font-medium uppercase tracking-widest" style={{ color: '#584144' }}>Step 1 of 4</span>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#ad2c4d' }}>25% Complete</span>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: '#e5e2e1' }}>
              <div className="h-full w-1/4 rounded-full" style={{ background: '#ad2c4d' }} />
            </div>
          </div>

          {/* Question Card */}
          <section className="flex flex-col gap-5">
            <h2 className="text-xl font-bold tracking-tight leading-snug" style={{ color: '#1c1b1b' }}>
              What best describes your current situation?
            </h2>
            <div className="flex flex-col gap-3">
              {[
                'Unemployed and seeking work',
                'Employed but seeking a new career',
                'Currently a student',
                'Other professional transition',
              ].map((opt, i) => (
                <label key={opt} className="flex items-center h-14 px-4 rounded-xl cursor-pointer transition-all active:scale-[0.98]" style={{ background: '#fff', border: i === 0 ? '2px solid #ad2c4d' : '1px solid rgba(222,191,194,0.3)', boxShadow: '0 1px 4px rgba(28,27,27,0.04)' }}>
                  <input type="radio" name="situation" defaultChecked={i === 0} className="w-5 h-5" style={{ accentColor: '#8c0f37' }} />
                  <span className="ml-4 text-sm font-medium" style={{ color: '#1c1b1b' }}>{opt}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Action Area */}
          <div className="flex flex-col gap-5">
            <button className="w-full h-14 font-bold rounded-xl shadow-lg text-white" style={{ background: 'linear-gradient(90deg, #8c0f37, #ad2c4d)' }}>
              Next
            </button>
            <div className="flex items-center justify-center gap-2" style={{ opacity: 0.6 }}>
              <span className="material-symbols-outlined text-sm" style={{ color: '#584144' }}>lock</span>
              <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#584144' }}>Your info is private and secure</span>
            </div>
            <p className="text-center text-sm" style={{ color: '#584144' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold" style={{ color: '#ad2c4d' }}>Log in</Link>
            </p>
          </div>
        </main>
      </div>

      {/* ══════════════════════════════════════════════
          DESKTOP LAYOUT ≥641px
          ══════════════════════════════════════════════ */}
      <div className="hidden md:block">

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
              After you apply, a counselor reviews your goals, walks through best-fit program options, and follows up within 3–5 business days.
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
          <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Log in</Link>
          </p>
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
              Applications are reviewed within 3–5 business days. A counselor will contact you to discuss your best-fit program.
            </p>
          </div>
        </div>
      </div>

      <Footer />

      </div>{/* end desktop wrapper */}

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
