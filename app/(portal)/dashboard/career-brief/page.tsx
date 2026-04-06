import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefs } from '@/lib/content/careerBriefs';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import CareerBriefList from '@/components/portal/CareerBriefList';
import CareerBriefForYou from '@/components/portal/CareerBriefForYou';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Weekly Career Brief',
  description: 'Weekly guidance and opportunity updates for WorkforceAP members.',
  path: '/dashboard/career-brief',
});

export default async function CareerBriefPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/dashboard/career-brief');

  const [briefs, context] = await Promise.all([
    Promise.resolve(getCareerBriefs()),
    getCareerBriefContext(user.id),
  ]);

  return (
    <>
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <p style={{ marginBottom: '0.75rem' }}>
            <Link href="/dashboard/weekly-recap" className="resource-back-link" style={{ display: 'inline' }}>
              View Weekly Recap →
            </Link>
          </p>
          <h1>Weekly Career Brief</h1>
          <p>Guidance, tips, and opportunity updates to keep your job search on track.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
            Exploring public training funding? Complete the{' '}
            <Link href="/dashboard/learning/wioa-qualification" className="resource-back-link">
              WIOA eligibility screening
            </Link>{' '}
            in the Learning Hub (informational — staff confirm eligibility).
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <CareerBriefForYou context={context} />
          <h2 className="career-brief-section-title">Weekly Briefs</h2>
          <CareerBriefList briefs={briefs} />
        </div>
      </section>

    </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
