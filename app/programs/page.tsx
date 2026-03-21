import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import ProgramsContent from './ProgramsContent';

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
      <ProgramsContent />
      <Footer />
    </div>
  );
}
