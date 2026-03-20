import type { Metadata } from 'next';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import JobsListingClient from './JobsListingClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Board',
  description: 'Browse job openings from WorkforceAP employer partners. Pre-screened, certified talent ready to hire.',
  path: '/jobs',
});

export default function JobsPage() {
  return (
    <div className="inner-page">
      <PageHero
        title="Job Board"
        subtitle="Browse openings from employers hiring WorkforceAP graduates and students."
      />
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container">
          <JobsListingClient />
        </div>
      </section>
      <Footer />
    </div>
  );
}
