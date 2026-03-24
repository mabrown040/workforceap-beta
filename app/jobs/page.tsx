import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import JobsListingClient from './JobsListingClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Board',
  description: 'Browse job openings from WorkforceAP employer partners. Log in to apply.',
  path: '/jobs',
});

export default async function JobsPage() {
  const user = await getUser();

  return (
    <div className="inner-page">
      <PageHero
        title="Job Board"
        subtitle="Browse openings from employers hiring WorkforceAP graduates and members. Create a free account or log in to apply."
      />
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container">
          {!user ? (
            <p className="jobs-public-cta" style={{ marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <strong>Applying is for members.</strong>{' '}
              <a href="/login?redirectTo=/jobs" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                Log in
              </a>{' '}
              or{' '}
              <a href="/apply" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                start an application
              </a>{' '}
              to submit your profile to roles you choose.
            </p>
          ) : null}
          <Suspense fallback={<p className="job-loading">Loading jobs…</p>}>
            <JobsListingClient isAuthenticated={!!user} />
          </Suspense>
        </div>
      </section>
      <Footer />
    </div>
  );
}
