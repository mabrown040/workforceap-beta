import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata, SITE_URL } from '@/app/seo';
import Link from 'next/link';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import { getProgramComparisonTracks } from '@/lib/content/programComparisonTracks';
import ProgramComparisonClient from './ProgramComparisonClient';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';

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

export default function ProgramComparisonPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Compare Programs"
        subtitle="One decision journey: narrow your options, then put 2–4 tracks side-by-side to see tradeoffs — time, difficulty, salary band, and best-fit."
      >
        <div className="programs-decision-cta" style={{ marginTop: '1rem' }}>
          <ExperimentedCtaLink
            experiment="program_compare_quiz_cta"
            variants={[
              { id: 'control', label: 'Not sure? Take the 2-minute pathfinder quiz →', className: 'btn btn-primary', href: '/find-your-path' },
              { id: 'outcome_copy', label: 'See your top-fit track in 2 minutes →', className: 'btn btn-primary', href: '/find-your-path' },
            ]}
          />
        </div>
      </PageHero>

      <section className="content-section">
        <div className="container">
          <ProgramsDecisionJourneyNav current="compare" />
          <Suspense
            fallback={
              <p className="program-comparison-suspense" style={{ padding: '2rem 0', color: 'var(--color-gray-600)' }}>
                Loading comparison tools…
              </p>
            }
          >
            <ProgramComparisonClient tracks={tracks} />
          </Suspense>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link href="/salary-guide" className="btn btn-outline">
              View Full Salary Guide
            </Link>
            &nbsp;&nbsp;
            <Link href="/apply" className="btn btn-primary">
              Apply Now
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
