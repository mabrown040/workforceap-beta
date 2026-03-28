import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';
import ProgramsDecisionJourneyNav from '@/components/ProgramsDecisionJourneyNav';
import ExperimentedCtaLink from '@/components/analytics/ExperimentedCtaLink';
import { WORKFORCEAP_PROGRAM_CATALOG_SIZE } from '@/lib/content/programs';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Career Training Programs in Austin, TX',
  description: `Explore ${WORKFORCEAP_PROGRAM_CATALOG_SIZE} free career training programs in Austin, TX. CompTIA, Google Cybersecurity, AWS Cloud, IBM Data Science, medical coding, manufacturing — no-cost certifications for qualifying Austin-area residents.`,
  path: '/programs',
});

export default function ProgramsPage() {
  return (
    <div className="inner-page programs-page">
      <PageHero
        title="Our Programs"
        subtitle={`${WORKFORCEAP_PROGRAM_CATALOG_SIZE} no-cost career programs with industry certifications from Google, IBM, AWS, Microsoft, and CompTIA. Use fit, timeline, and readiness — not just the title — to choose your track.`}
      >
        <div className="programs-decision-cta">
          <p className="programs-decision-lead">Not sure which program fits you?</p>
          <ExperimentedCtaLink
            experiment="programs_primary_cta"
            variants={[
              { id: 'control', label: 'Find Your Career →', className: 'btn btn-primary', href: '/find-your-path' },
              { id: 'quiz_first', label: 'Take 2-Min Quiz →', className: 'btn btn-primary', href: '/find-your-path' },
            ]}
          />
          <Link href="/program-comparison" className="programs-compare-link">Or compare programs side-by-side</Link>
        </div>
      </PageHero>
      <section className="content-section" style={{ paddingTop: '0.5rem', paddingBottom: 0 }}>
        <div className="container">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>
      <section className="content-section" style={{ paddingTop: '1rem', paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            <strong>AI-powered support:</strong> After you enroll, the member portal includes guided tools for resumes,
            interviews, and applications — alongside counselor coaching.
          </p>
        </div>
      </section>
      <ProgramsContent />
      <Footer />
    </div>
  );
}
