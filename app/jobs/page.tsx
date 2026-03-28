import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getAgeGroup } from '@/lib/util/ageCalculation';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import JobsListingClient from './JobsListingClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Opportunities',
  description: 'Browse job openings from WorkforceAP employer partners. These roles are actively hiring WorkforceAP graduates. Log in to apply.',
  path: '/jobs',
});

export default async function JobsPage() {
  const user = await getUser();
  
  let ageGroup: 'under14' | 'youth14to17' | 'adult18plus' = 'adult18plus';
  if (user) {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: user.id },
        select: { dob: true, isMinor: true },
      });
      if (profile?.dob) {
        ageGroup = getAgeGroup(profile.dob);
      }
    } catch (e) {
      // Fallback to adult if DB query fails
      ageGroup = 'adult18plus';
    }
  }

  return (
    <div className="inner-page stitch-dark">
      <PageHero
        title="Job Opportunities — Hiring WorkforceAP Graduates"
        subtitle="These roles are actively hiring WorkforceAP graduates. Training is free for members — create an account or log in to apply."
      />
      <section className="content-section stitch-section" style={{ paddingTop: '1rem' }}>
        <div className="container">
          {!user ? (
            <div className="stitch-card stitch-card-muted" style={{ marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                <strong>Applying is for members.</strong>{' '}
                <a href="/login?redirectTo=/jobs" className="stitch-link">
                  Log in
                </a>{' '}
                or{' '}
                <a href="/apply" className="stitch-link">
                  start an application
                </a>{' '}
                to submit your profile to roles you choose.
              </p>
            </div>
          ) : null}
          {ageGroup === 'under14' ? (
            <div className="stitch-card stitch-card-highlight">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', color: '#fff' }}>
                Career Exploration for Young Learners
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Job applications are available for members 14 and older. For now, focus on exploring 
                career paths and building skills through our training programs.
              </p>
              <a href="/programs" className="btn btn-primary">
                Explore Training Programs
              </a>
            </div>
          ) : ageGroup === 'youth14to17' ? (
            <>
              <div className="stitch-badge stitch-badge-youth" style={{ marginBottom: '1.5rem' }}>
                <strong>Youth Job Board:</strong> Showing jobs appropriate for ages 14-17. 
                These positions comply with youth labor laws and work permit requirements.
              </div>
              <Suspense fallback={<p className="job-loading">Loading youth-appropriate jobs…</p>}>
                <JobsListingClient isAuthenticated={!!user} ageGroup={ageGroup} />
              </Suspense>
            </>
          ) : (
            <Suspense fallback={<p className="job-loading">Loading jobs…</p>}>
              <JobsListingClient isAuthenticated={!!user} ageGroup={ageGroup} />
            </Suspense>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}
