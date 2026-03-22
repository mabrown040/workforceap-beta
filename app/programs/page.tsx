import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description:
    'Explore 19 free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.',
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="inner-page programs-page">
      <PageHero
        title="Our Programs"
        subtitle="19 no-cost career programs with industry certifications from Google, IBM, AWS, Microsoft, and CompTIA. Use fit, timeline, and readiness — not just the title — to choose your track."
      >
        <div className="programs-decision-cta">
          <p className="programs-decision-lead">Not sure which program fits you?</p>
          <Link href="/find-your-path" className="btn btn-primary">
            Take the 2-minute pathfinder quiz →
          </Link>
          <Link href="/program-comparison" className="programs-compare-link">Or compare programs side-by-side</Link>
        </div>
      </PageHero>
      <section className="content-section" style={{ paddingTop: '0.5rem', paddingBottom: 0 }}>
        <div className="container">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>
      <section className="content-section programs-mid-cta-section" aria-label="Next steps">
        <div className="container">
          <div className="programs-mid-cta">
            <div className="programs-mid-cta__copy">
              <h2 className="programs-mid-cta__title">Ready to pick a track?</h2>
              <p className="programs-mid-cta__desc">
                Use the quiz for personalized ideas, compare side-by-side, then apply — most people finish in about 10
                minutes.
              </p>
            </div>
            <div className="programs-mid-cta__actions">
              <Link href="/find-your-path" className="btn btn-primary">
                2-minute pathfinder quiz
              </Link>
              <Link href="/program-comparison" className="btn btn-outline">
                Compare programs
              </Link>
              <Link href="/apply" className="btn btn-secondary">
                Start application
              </Link>
            </div>
          </div>
        </div>
      </section>
      <ProgramsContent />
      <Footer />
    </div>
  );
}
