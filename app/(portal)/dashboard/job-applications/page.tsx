import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import JobApplicationsTracker from '@/components/portal/JobApplicationsTracker';
import PageHeader from '@/components/portal/PageHeader';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Application tracker',
  description: 'Track your job applications and interview progress from the Jobs workflow.',
  path: '/dashboard/job-applications',
});
}

export default async function JobApplicationsPage() {
  const user = await getUser();
  
  if (!user?.id) {
    redirect('/login?redirectTo=/dashboard/job-applications');
  }

  return (
    <>
    <div style={{ maxWidth: 'var(--max-width, 64rem)', margin: '0 auto', padding: '1rem 1rem 2rem' }}>
      <PageHeader
        title="Application tracker"
        subtitle="Track every job you've applied to and where you stand in the process. This lives under Jobs so saved roles, outreach, and application status stay in one workflow."
        breadcrumbs={[
          { label: 'Member Portal', href: '/dashboard' },
          { label: 'Application tracker' },
        ]}
      />
      <JobApplicationsTracker userId={user.id} />
    </div>    </>
  );
}
