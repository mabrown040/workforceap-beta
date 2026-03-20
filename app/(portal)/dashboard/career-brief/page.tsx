import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getCareerBriefs } from '@/lib/content/careerBriefs';
import { getCareerBriefContext } from '@/lib/content/careerBriefPersonalization';
import Footer from '@/components/Footer';
import { SignOutButton } from '@/components/portal/SignOutButton';
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
        <div className="page-hero-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Weekly Career Brief</h1>
            <p>Guidance, tips, and opportunity updates to keep your job search on track.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/dashboard" className="btn" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.4)' }}>
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <CareerBriefForYou context={context} />
          <h2 className="career-brief-section-title">Weekly Briefs</h2>
          <CareerBriefList briefs={briefs} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
