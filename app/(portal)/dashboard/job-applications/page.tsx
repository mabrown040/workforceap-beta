import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import PageHeader from '@/components/portal/PageHeader';
import { DesignSurface } from '@/components/portal/kit';

const JobApplicationsTracker = dynamic(() => import('@/components/portal/JobApplicationsTracker'), {
  loading: () => (
    <div
      role="status"
      aria-live="polite"
      className="wa-kit-card"
      style={{
        minHeight: 240,
        padding: 'var(--wa-pad)',
        color: 'var(--wa-muted)',
        fontSize: 'var(--wa-type-body)',
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
  const t = await getTranslations('dashboard');

  if (!user?.id) {
    redirect('/login?redirectTo=/dashboard/job-applications');
  }

  return (
    <DesignSurface surface="warm">
      <div
        style={{
          maxWidth: 'var(--max-width, 64rem)',
          margin: '0 auto',
          padding: 'var(--wa-pad-sm) var(--wa-pad-sm) var(--wa-pad)',
        }}
      >
        <PageHeader
          title={t('jobApplicationsMetaTitle')}
          subtitle={t('jobApplicationsSubtitle')}
          breadcrumbs={[
            { label: t('memberPortal'), href: '/dashboard' },
            { label: t('jobApplicationsMetaTitle') },
          ]}
        />
        <JobApplicationsTracker userId={user.id} />
      </div>
    </DesignSurface>
  );
}
