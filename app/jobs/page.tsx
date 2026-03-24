import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import JobsListingClient from './JobsListingClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Board',
  description: 'Member-only job openings from WorkforceAP employer partners.',
  path: '/jobs',
});

export default async function JobsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/jobs');

  return (
    <div className="inner-page">
      <PageHero
        title="Job Board"
        subtitle="Browse openings from employers hiring WorkforceAP graduates and members."
      />
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container">
          <Suspense fallback={<p className="job-loading">Loading jobs…</p>}>
            <JobsListingClient />
          </Suspense>
        </div>
      </section>
      <Footer />
    </div>
  );
}
