import type { Metadata } from 'next';
import { Suspense } from 'react';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getAgeGroup } from '@/lib/util/ageCalculation';
import MainNav from '@/components/MainNav';
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
    <div className="wa-min-h-screen wa-bg-white dark:wa-bg-[#141313] wa-text-gray-900 dark:wa-text-[#e6e1e1]">
      <MainNav />

      {/* Hero */}
      <section className="wa-pt-32 wa-pb-16 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-5xl wa-mx-auto wa-text-center">
          <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-6">
            <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
            <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Employer Partners</span>
          </div>
          <h1 className="wa-text-5xl md:wa-text-6xl wa-font-extrabold wa-tracking-tight wa-leading-none wa-mb-4">
            Job{' '}
            <span style={{ backgroundImage: 'linear-gradient(to right, #ad2c4d, #ffb2bc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Opportunities
            </span>
          </h1>
          <p className="wa-text-xl wa-text-gray-600 dark:wa-text-[#debfc2] wa-max-w-2xl wa-mx-auto">
            These roles are actively hiring WorkforceAP graduates. Training is free for members — create an account or log in to apply.
          </p>
        </div>
      </section>

      <section className="wa-pb-24 wa-px-6 md:wa-px-12">
        <div className="wa-max-w-6xl wa-mx-auto">
          {!user ? (
            <div className="wa-bg-white/5 wa-border wa-border-white/10 wa-rounded-2xl wa-backdrop-blur wa-p-4 wa-mb-6">
              <p className="wa-m-0 wa-text-sm wa-leading-relaxed dark:wa-text-[#debfc2]">
                <strong>Applying is for members.</strong>{' '}
                <a href="/login?redirectTo=/jobs" className="wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] hover:wa-underline">
                  Log in
                </a>{' '}
                or{' '}
                <a href="/apply" className="wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc] hover:wa-underline">
                  start an application
                </a>{' '}
                to submit your profile to roles you choose.
              </p>
            </div>
          ) : null}

          {ageGroup === 'under14' ? (
            <div className="wa-bg-[rgba(173,44,77,0.08)] wa-border wa-border-[rgba(173,44,77,0.2)] wa-rounded-2xl wa-p-8">
              <h3 className="wa-text-xl wa-font-semibold wa-mb-3 dark:wa-text-[#e6e1e1]">
                Career Exploration for Young Learners
              </h3>
              <p className="dark:wa-text-[rgba(255,255,255,0.8)] wa-leading-relaxed wa-mb-4">
                Job applications are available for members 14 and older. For now, focus on exploring
                career paths and building skills through our training programs.
              </p>
              <a href="/programs" className="wa-inline-flex wa-items-center wa-px-6 wa-py-3 wa-bg-gradient-to-r wa-from-[#ad2c4d] wa-to-[#c9364f] wa-text-white wa-rounded-xl wa-font-bold wa-no-underline">
                Explore Training Programs
              </a>
            </div>
          ) : ageGroup === 'youth14to17' ? (
            <>
              <div className="wa-inline-flex wa-items-center wa-gap-2 wa-bg-[rgba(113,51,62,0.1)] dark:wa-bg-[rgba(113,51,62,0.2)] wa-border wa-border-[rgba(173,44,77,0.15)] wa-px-4 wa-py-1.5 wa-rounded-full wa-mb-4">
                <span className="wa-w-2 wa-h-2 wa-rounded-full wa-bg-[#ad2c4d] wa-inline-block" />
                <span className="wa-text-[10px] wa-font-bold wa-uppercase wa-tracking-[0.1em] wa-text-[#ad2c4d] dark:wa-text-[#ffb2bc]">Youth Job Board</span>
              </div>
              <p className="wa-text-sm dark:wa-text-[#debfc2] wa-mb-6">
                Showing jobs appropriate for ages 14–17. These positions comply with youth labor laws and work permit requirements.
              </p>
              <Suspense fallback={<p className="dark:wa-text-[#debfc2]">Loading youth-appropriate jobs…</p>}>
                <JobsListingClient isAuthenticated={!!user} ageGroup={ageGroup} />
              </Suspense>
            </>
          ) : (
            <Suspense fallback={<p className="dark:wa-text-[#debfc2]">Loading jobs…</p>}>
              <JobsListingClient isAuthenticated={!!user} ageGroup={ageGroup} />
            </Suspense>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
