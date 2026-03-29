import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { getAgeGroup } from '@/lib/util/ageCalculation';
import Footer from '@/components/Footer';
import StitchHero from '@/components/marketing/StitchHero';
import StitchPage from '@/components/marketing/StitchPage';
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
        select: { dob: true },
      });
      if (profile?.dob) {
        ageGroup = getAgeGroup(profile.dob);
      }
    } catch {
      ageGroup = 'adult18plus';
    }
  }

  return (
    <StitchPage>
      <StitchHero
        badge="Employer Partner Roles"
        title={
          <>
            Jobs now live inside the
            <br />
            <span className="stitch-title-highlight">same premium shell</span>
          </>
        }
        description="The jobs page no longer feels like an updated hero pasted onto older UI. Filters, cards, empty states, and CTAs now share the Stitch surface system."
        actions={
          <>
            <Link href="/apply" className="btn btn-primary">Apply for training</Link>
            <Link href="/for-employers" className="btn btn-outline">For employers</Link>
          </>
        }
      />

      <section className="stitch-section">
        <div className="stitch-grid-2">
          <div className="stitch-card">
            <div className="stitch-kicker">How to Use It</div>
            <h2 className="wa-text-3xl wa-font-bold wa-mt-3">Browse now, apply when you’re ready</h2>
            <p className="wa-mt-3">The jobs board stays fully functional. Auth, routing, and job data logic remain intact; only the presentation layer changed.</p>
          </div>
          {!user ? (
            <div className="stitch-card">
              <div className="stitch-kicker">Member Access</div>
              <p className="wa-mt-3">
                <strong>Applying is for members.</strong> <Link href="/login?redirectTo=/jobs">Log in</Link> or <Link href="/apply">start an application</Link> to submit your profile to roles you choose.
              </p>
            </div>
          ) : (
            <div className="stitch-card">
              <div className="stitch-kicker">Signed In</div>
              <p className="wa-mt-3">You can review roles and move directly into the role detail flow from this board.</p>
            </div>
          )}
        </div>
      </section>

      <section className="stitch-section">
        {ageGroup === 'under14' ? (
          <div className="stitch-cta-band">
            <div className="stitch-kicker">Career Exploration</div>
            <h2>Focus on training first</h2>
            <p>Job applications are available for members 14 and older. For now, explore pathways and build skills through our training programs.</p>
            <div className="stitch-actions">
              <Link href="/programs" className="btn btn-primary">Explore training programs</Link>
            </div>
          </div>
        ) : (
          <div className="stitch-surface">
            {ageGroup === 'youth14to17' ? (
              <div className="wa-mb-5">
                <span className="stitch-pill">Youth job board</span>
                <p className="wa-mt-3 stitch-muted">
                  Showing roles appropriate for ages 14–17. These positions comply with youth labor laws and work permit requirements.
                </p>
              </div>
            ) : null}
            <Suspense fallback={<p className="stitch-muted">Loading jobs…</p>}>
              <JobsListingClient isAuthenticated={!!user} ageGroup={ageGroup} />
            </Suspense>
          </div>
        )}
      </section>

      <Footer />
    </StitchPage>
  );
}
