import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadataAsync } from '@/app/seo';
import LocalizedLink from '@/components/LocalizedLink';
import { getProgramComparisonTracks } from '@/lib/content/programComparisonTracks';
import ProgramComparisonClient from './ProgramComparisonClient';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Compare Programs',
    description:
      'Compare WorkforceAP career tracks side-by-side: duration, salary, demand, and fit. Pick programs to compare or start from recommended paths.',
    path: '/program-comparison',
  });
}

const tracks = getProgramComparisonTracks();

export default function ProgramComparisonPage() {
  return (
    <div
      className="inner-page marketing-stack marketing-stack--enter"
      style={{ background: 'var(--color-background-dark)', color: 'var(--color-on-surface)' }}
    >
      <section style={{ padding: 'clamp(2rem, 5vw, 5rem) 1.25rem 2.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ maxWidth: '720px' }}>
          <span className="marketing-pill-chip-accent" style={{ marginBottom: '1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }} aria-hidden="true">compare_arrows</span>
            Program Comparison
          </span>
          <h1 className="text-display-lg" style={{ marginBottom: '1rem' }}>
            Which program fits your goals?
          </h1>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
            Compare programs side-by-side on the factors that matter: time commitment, difficulty, skill area, job direction, and salary potential.
            Pick 2–4 tracks to see tradeoffs at a glance.
          </p>
          <ExperimentedCtaLink
            experiment="program_compare_quiz_cta"
            variants={[
              { id: 'control', label: 'Not sure? Take the 5-minute pathfinder quiz', className: 'btn btn-primary', href: '/find-your-path' },
              { id: 'outcome_copy', label: 'See your top-fit track in 5 minutes', className: 'btn btn-primary', href: '/find-your-path' },
            ]}
          />
        </div>
      </section>

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.25rem 3rem' }}>
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

      <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>
        <div className="program-comparison-bottom-grid" style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{
            background: 'var(--surface-container)', borderRadius: 'var(--radius-xl)',
            padding: '2rem', border: '1px solid var(--surface-container-highest)',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)', background: 'rgba(173,44,77,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-accent)' }}>
              <span className="material-symbols-outlined" aria-hidden="true">route</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Need a personalized path?</h3>
            <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>
              Our career advisors can help you map a custom program sequence based on your background, goals, and timeline. No cost, no obligation.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <LocalizedLink href="/find-your-path" className="btn btn-primary btn-small">Take the Quiz</LocalizedLink>
              <LocalizedLink href="/programs" className="btn btn-outline btn-small">Explore Programs</LocalizedLink>
            </div>
          </div>

          <div style={{
            background: 'var(--color-accent)', borderRadius: 'var(--radius-xl)',
            padding: '2rem', color: 'white',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" aria-hidden="true">school</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>No Cost for Qualifying Members</h3>
            <p style={{ opacity: 0.9, lineHeight: 1.7, fontSize: '0.95rem', margin: 0 }}>
              WorkforceAP programs are offered at no cost for qualifying members. Training is available through WorkforceAP and partner-backed pathways.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <LocalizedLink href="/salary-guide" className="btn btn-small" style={{ background: 'white', color: 'var(--color-accent)', fontWeight: 700 }}>
                View Salary Guide
              </LocalizedLink>
              <LocalizedLink href="/apply" className="btn btn-small" style={{ border: '1px solid rgba(255,255,255,0.35)', color: '#fff' }}>
                Apply Now
              </LocalizedLink>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .program-comparison-bottom-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        @media (max-width: 767px) {
          .program-comparison-bottom-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .program-comparison-category-row td {
          padding: 0.5rem 0.75rem 0.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--color-accent);
          background: rgba(173, 44, 77, 0.07);
          border-top: 1px solid rgba(173, 44, 77, 0.2);
        }
        .program-comparison-category-row:first-child td {
          border-top: none;
        }
      `}</style>
    </div>
  );
}
