import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefs } from '@/lib/content/careerBriefs';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import CareerBriefList from '@/components/portal/CareerBriefList';
import CareerBriefForYou from '@/components/portal/CareerBriefForYou';

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
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Weekly Career Brief</h1>
          <p>Guidance, tips, and opportunity updates to keep your job search on track.</p>
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
  );
}
