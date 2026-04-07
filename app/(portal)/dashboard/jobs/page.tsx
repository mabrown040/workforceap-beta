import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { isExcludedPublicEmployerName } from '@/lib/jobs/publicJobFilters';
import { getAgeGroup } from '@/lib/util/ageCalculation';
import PageHero from '@/components/PageHero';
import PortalBreadcrumb from '@/components/portal/PortalBreadcrumb';
import PortalFooter from '@/components/portal/PortalFooter';
import JobsListingClient from './JobsListingClient';
import JobsBoardSkeleton from './JobsBoardSkeleton';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Job Board',
  description: 'Browse job openings from WorkforceAP employer partners. Log in to apply.',
  path: '/dashboard/jobs',
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
    } catch {
      ageGroup = 'adult18plus';
    }
  }

  // SSR: Prefetch first 20 jobs for SEO and faster initial load
  let initialJobs: Array<{
    id: string;
    title: string;
    location: string | null;
    locationType: string;
    jobType: string;
    salaryMin: number | null;
    salaryMax: number | null;
    employer: { companyName: string; logoUrl: string | null };
  }> = [];
  let initialTotal = 0;

  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: 'live',
        ...(ageGroup === 'under14' ? { id: 'impossible-match' } : {}),
        ...(ageGroup === 'youth14to17' ? {
          youthAppropriate: true,
          OR: [
            { minimumAge: null },
            { minimumAge: { lte: 17 } },
          ],
        } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        employer: { select: { companyName: true, logoUrl: true } },
      },
    });
    const visible = jobs.filter((j) => !isExcludedPublicEmployerName(j.employer.companyName));
    initialJobs = visible;
    initialTotal = visible.length;
  } catch {
    // Fallback to empty state if query fails
    initialJobs = [];
    initialTotal = 0;
  }

  return (
    <>
    <div className="inner-page">
      <PageHero
        beforeTitle={
          <PortalBreadcrumb
            items={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'Job Board' }]}
          />
        }
        title="Job Board"
        subtitle="Browse openings from employers hiring WorkforceAP graduates and members. Create a free account or log in to apply."
      />
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container">
          {!user ? (
            <p className="jobs-public-cta" style={{ marginBottom: '1.25rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              <strong>Applying is for members.</strong>{' '}
              <a href="/login?redirectTo=/dashboard/jobs" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                Log in
              </a>{' '}
              or{' '}
              <a href="/apply" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                start an application
              </a>{' '}
              to submit your profile to roles you choose.
            </p>
          ) : null}
          {ageGroup === 'under14' ? (
            <div style={{
              padding: '2rem',
              background: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                Career Exploration for Young Learners
              </h3>
              <p style={{ color: 'var(--color-on-surface-variant)', lineHeight: 1.6, marginBottom: '1rem' }}>
                Job applications are available for members 14 and older. For now, focus on exploring 
                career paths and building skills through our training programs.
              </p>
              <a href="/programs" className="btn btn-primary">
                Explore Training Programs
              </a>
            </div>
          ) : ageGroup === 'youth14to17' ? (
            <>
              <div style={{
                padding: '1rem',
                background: 'var(--surface-container)',
                border: '1px solid var(--surface-container-highest)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem'
              }}>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                  <strong>Youth Job Board:</strong> Showing jobs appropriate for ages 14-17. 
                  These positions comply with youth labor laws and work permit requirements.
                </p>
              </div>
              <Suspense fallback={<JobsBoardSkeleton />}>
                <JobsListingClient 
                  isAuthenticated={!!user} 
                  ageGroup={ageGroup} 
                  initialJobs={initialJobs}
                  initialTotal={initialTotal}
                />
              </Suspense>
            </>
          ) : (
            <Suspense fallback={<JobsBoardSkeleton />}>
              <JobsListingClient 
                isAuthenticated={!!user} 
                ageGroup={ageGroup}
                initialJobs={initialJobs}
                initialTotal={initialTotal}
              />
            </Suspense>
          )}
        </div>
      </section>
      <PortalFooter />
    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
