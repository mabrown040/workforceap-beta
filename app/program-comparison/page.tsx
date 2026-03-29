import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata, SITE_URL } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { getProgramComparisonTracks } from '@/lib/content/programComparisonTracks';
import ProgramComparisonClient from './ProgramComparisonClient';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Compare Programs',
    description:
      'Compare WorkforceAP career tracks side-by-side: duration, salary, demand, and fit. Pick programs to compare or start from recommended paths.',
    path: '/program-comparison',
  }),
  alternates: {
    canonical: `${SITE_URL}/program-comparison`,
  },
};

const tracks = getProgramComparisonTracks();

const COMPARISON_ROWS = [
  { label: 'Duration', a: '12 Weeks', b: '16 Weeks' },
  { label: 'Cost', a: '$4,200', b: '$3,850', highlight: true },
  { label: 'Certification', a: 'Advanced AI Cert (AAIC)', b: 'CompTIA Sec+ / GSEC' },
  { label: 'Career Paths', a: 'ML Engineer, AI Consultant', b: 'SOC Analyst, Sec Engineer' },
  { label: 'Salary Range', a: '$95k – $140k', b: '$88k – $130k' },
];

export default function ProgramComparisonPage() {
  return (
    <div className="inner-page" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>

      {/* ===== MOBILE VIEW (≤640px) ===== */}
      <div className="md:hidden bg-[#fcf9f8] text-[#1c1b1b] min-h-screen pb-32">
        {/* Top App Bar */}
        <header className="fixed top-0 w-full z-50 bg-[#fcf9f8]/80 backdrop-blur-xl flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-[#ad2c4d] cursor-pointer active:scale-95 duration-200">menu</span>
            <h1 className="font-black tracking-tighter text-[#ad2c4d] text-xl">Workforce Academy</h1>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#ebe7e7] overflow-hidden border border-[#debfc2]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#584144] text-[18px]">person</span>
          </div>
        </header>

        <main className="pt-24 px-6 max-w-[390px] mx-auto">
          {/* Hero */}
          <section className="mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#1c1b1b] mb-3 leading-tight">Compare Programs</h1>
            <p className="text-[#584144] text-base leading-relaxed">Find the right fit for your goals and timeline through our curated workforce paths.</p>
          </section>

          {/* Program Selectors */}
          <section className="space-y-4 mb-12">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-semibold text-[#584144] ml-1">Program One</label>
              <div className="relative">
                <select className="w-full h-14 pl-4 pr-10 appearance-none bg-[#ebe7e7] rounded-xl text-[#1c1b1b] font-medium focus:ring-0 focus:outline-none transition-all duration-300">
                  <option>AI Professional Developer</option>
                  <option>Cybersecurity Specialist</option>
                  <option>Data Science Analyst</option>
                  <option>Cloud Architect</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-4 text-[#584144] pointer-events-none">expand_more</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider font-semibold text-[#584144] ml-1">Program Two</label>
              <div className="relative">
                <select className="w-full h-14 pl-4 pr-10 appearance-none bg-[#ebe7e7] rounded-xl text-[#1c1b1b] font-medium focus:ring-0 focus:outline-none transition-all duration-300">
                  <option>Cybersecurity Specialist</option>
                  <option>AI Professional Developer</option>
                  <option>Data Science Analyst</option>
                  <option>Cloud Architect</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-4 text-[#584144] pointer-events-none">expand_more</span>
              </div>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="bg-[#f6f3f2] rounded-2xl p-4 mb-10 overflow-hidden">
            {/* Column Headers */}
            <div className="grid grid-cols-2 gap-4 mb-6 pt-2">
              <div className="text-center px-2">
                <div className="h-1 bg-[#ad2c4d]/20 rounded-full mb-3"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#ad2c4d] block mb-1">Path A</span>
                <span className="text-sm font-bold leading-tight block">AI Professional</span>
              </div>
              <div className="text-center px-2">
                <div className="h-1 bg-[#ffbb00]/30 rounded-full mb-3"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#7b5800] block mb-1">Path B</span>
                <span className="text-sm font-bold leading-tight block">Cybersecurity</span>
              </div>
            </div>

            {/* Comparison Rows */}
            <div className="space-y-6">
              {COMPARISON_ROWS.map((row) => (
                <div key={row.label} className="border-t border-[#debfc2]/10 pt-4">
                  <span className="text-[10px] font-bold text-[#584144]/60 uppercase tracking-tighter block text-center mb-2">{row.label}</span>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <p className={`text-sm ${row.highlight ? 'font-bold text-[#8c0f37]' : 'font-medium'}`}>{row.a}</p>
                    <p className={`text-sm ${row.highlight ? 'font-bold text-[#8c0f37]' : 'font-medium'}`}>{row.b}</p>
                  </div>
                </div>
              ))}

              {/* Difficulty dots */}
              <div className="border-t border-[#debfc2]/10 pt-4 pb-2">
                <span className="text-[10px] font-bold text-[#584144]/60 uppercase tracking-tighter block text-center mb-2">Difficulty</span>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="flex justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ffbb00]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#ffbb00]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#ffbb00]"></span>
                  </div>
                  <div className="flex justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#ffbb00]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#ffbb00]"></span>
                    <span className="w-2 h-2 rounded-full bg-[#e5e2e1]"></span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Apply CTA */}
          <Link
            href="/apply"
            className="w-full bg-gradient-to-r from-[#8c0f37] to-[#ad2c4d] text-white h-14 rounded-xl font-bold tracking-tight shadow-lg shadow-[#8c0f37]/20 active:scale-95 transition-transform duration-200 flex items-center justify-center"
          >
            Apply to Best Match
          </Link>
        </main>

        <MobileBottomNav />
      </div>

      {/* ===== DESKTOP VIEW (>640px) ===== */}
      <div className="hidden md:block">
        {/* Hero */}
        <section style={{ padding: '5rem 2rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ maxWidth: '720px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-full, 50px)',
              background: 'rgba(173,44,77,0.15)', border: '1px solid rgba(173,44,77,0.3)',
              color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '1rem',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>compare_arrows</span>
              Curator Comparison
            </span>
            <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>
              Architect Your Civic Future
            </h1>
            <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.125rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              One decision journey: narrow your options, then put 2-4 tracks side-by-side to see tradeoffs — time, difficulty, salary band, and best-fit.
            </p>
            <ExperimentedCtaLink
              experiment="program_compare_quiz_cta"
              variants={[
                { id: 'control', label: 'Not sure? Take the 2-minute pathfinder quiz', className: 'btn btn-primary', href: '/find-your-path' },
                { id: 'outcome_copy', label: 'See your top-fit track in 2 minutes', className: 'btn btn-primary', href: '/find-your-path' },
              ]}
            />
          </div>
        </section>

        {/* Decision Path Tabs + Comparison Content */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 3rem' }}>
          <ProgramsDecisionJourneyNav current="compare" />
          <Suspense
            fallback={
              <p style={{ padding: '2rem 0', color: 'var(--color-on-surface-variant)' }}>
                Loading comparison tools...
              </p>
            }
          >
            <ProgramComparisonClient tracks={tracks} />
          </Suspense>
        </section>

        {/* Bento row: Personalized Path + Fellowship Grant */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem',
          }}>
            {/* Need a Personalized Path? */}
            <div style={{
              background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
              padding: '2.5rem', border: '1px solid var(--surface-container-highest)',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              <div style={{
                width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)',
                background: 'rgba(173,44,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-accent)',
              }}>
                <span className="material-symbols-outlined">route</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Need a Personalized Path?</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, fontSize: '0.9rem' }}>
                Our career advisors can help you map a custom program sequence based on your background, goals, and timeline. No cost, no obligation.
              </p>
              <div style={{ marginTop: 'auto' }}>
                <Link href="/find-your-path" className="btn btn-primary btn-small" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>explore</span>
                  Take the Quiz
                </Link>
              </div>
            </div>

            {/* Fellowship Grant card */}
            <div style={{
              background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)',
              padding: '2.5rem', color: 'white',
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}>
              <div style={{
                width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)',
                background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined">school</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Fellowship Grant</h3>
              <p style={{ opacity: 0.9, lineHeight: 1.7, fontSize: '0.9rem' }}>
                All WAP programs are offered at zero cost to members. Our fellowship model is funded through employer partnerships and successful placements.
              </p>
              <div style={{ marginTop: 'auto' }}>
                <Link href="/apply" className="btn btn-small" style={{
                  background: 'white', color: 'var(--color-accent)', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
                  Apply Now
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTAs */}
        <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem', textAlign: 'center' }}>
          <Link href="/salary-guide" className="btn btn-outline" style={{ marginRight: '1rem' }}>
            View Full Salary Guide
          </Link>
          <Link href="/apply" className="btn btn-primary">
            Apply Now
          </Link>
        </section>

        <Footer />
      </div>
    </div>
  );
}
