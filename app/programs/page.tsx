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
        title="Explore programs built for member outcomes"
        subtitle="For members and career changers: compare WorkforceAP programs by fit, credential, and timeline. Employers and partners can use this page to understand the talent pipeline members move through before they apply."
      >
        <div className="programs-decision-cta">
          <p className="programs-decision-lead">What this page does: show who each program is for, what credential it leads to, and where to go next.</p>
          <Link href="/programs" className="btn btn-primary" aria-current="page">
            Explore programs
          </Link>
          <Link href="/apply" className="btn btn-outline">
            Apply
          </Link>
          <Link href="/contact" className="programs-compare-link">Need guidance? Contact WorkforceAP</Link>
        </div>
      </PageHero>
      <section className="content-section" style={{ paddingTop: '0.5rem', paddingBottom: 0 }}>
        <div className="container">
          <ProgramsDecisionJourneyNav current="programs" />
        </div>
      </section>
      <ProgramsContent />
      <Footer />
    </div>
  );
}
