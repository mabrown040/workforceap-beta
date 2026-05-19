import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';

const JobApplicationsTracker = dynamic(() => import('@/components/portal/JobApplicationsTracker'), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="portal-card portal-card--flat"
      style={{
        minHeight: 240,
        padding: '2.5rem 1.25rem',
        borderRadius: 12,
        textAlign: 'center',
        color: 'var(--color-on-surface-variant)',
        fontSize: '0.9rem',
        fontWeight: 600,
      }}
    >
      Loading application tracker…
    </div>
  ),
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return buildPageMetadataAsync({
    title: t('jobApplicationsMetaTitle'),
    description: t('jobApplicationsMetaDesc'),
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
