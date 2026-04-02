import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata, SITE_URL } from '@/app/seo';
import Link from 'next/link';
import Footer from '@/components/Footer';
import { getProgramComparisonTracks } from '@/lib/content/programComparisonTracks';
import ProgramComparisonClient from './ProgramComparisonClient';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import ProgramComparisonMobile from './ProgramComparisonMobile';

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
  { label: 'Cost', a: '$0 Free', b: '$0 Free', highlight: true },
  { label: 'Certification', a: 'Google IT Support', b: 'CompTIA Security+' },
  { label: 'Career Paths', a: 'IT Support, Help Desk', b: 'SOC Analyst, Security Eng.' },
  { label: 'Starting Band', a: 'See salary guide', b: 'See salary guide' },
];

export default function ProgramComparisonPage() {
  return (
    <div className="inner-page" style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}>

      <ProgramComparisonMobile rows={COMPARISON_ROWS} />

      {/* ===== DESKTOP VIEW (≥768px) ===== */}
      <div className="wa-hidden md:wa-block marketing-desktop">
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
              One decision journey: narrow your options, then put 2-4 tracks side-by-side to see tradeoffs - time, difficulty, salary band, and best-fit.
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
                All WorkforceAP programs are offered at zero cost to members. Our fellowship model is funded through employer partnerships and successful placements.
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
