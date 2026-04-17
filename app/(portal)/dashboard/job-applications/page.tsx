import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import JobApplicationsTracker from '@/components/portal/JobApplicationsTracker';
import PageHeader from '@/components/portal/PageHeader';
import PortalFooter from '@/components/portal/PortalFooter';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Application Tracker',
  description: 'See every job you\'ve applied to and where things stand.',
  path: '/dashboard/job-applications',
});

export default async function JobApplicationsPage() {
  const user = await getUser();

  if (!user?.id) {
    redirect('/login?redirectTo=/dashboard/job-applications');
  }

  return (
    <>
      <div className="inner-page">
        <PageHeader
          title="Application Tracker"
          subtitle="See every job you've applied to and where things stand."
          breadcrumbs={[{ label: 'Member Portal', href: '/dashboard' }, { label: 'Application Tracker' }]}
        />
        <section className="content-section" style={{ paddingTop: '1rem' }}>
          <div className="container">
            <JobApplicationsTracker userId={user.id} />
          </div>
        </section>
        <PortalFooter />
      </div>
      <MobileBottomNav variant="portal" />
    </>
  );
}
