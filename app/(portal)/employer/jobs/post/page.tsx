import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import EmployerJobPostForm from '@/components/employer/EmployerJobPostForm';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Post a Job',
    description: 'Publish a job posting.',
    path: '/employer/jobs/post',
  });
}

export default async function EmployerJobPostPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/post');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  return (
    <PortalPageFrame>
      <PageHeader
        title="Post a job"
        subtitle="Publish to the job board. You can edit, pause, or close anytime from Job Postings."
        breadcrumbs={[
          { label: 'Job Postings', href: '/employer/jobs' },
          { label: 'Post a job' },
        ]}
        action={
          <Link
            href="/employer/jobs/new"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
            }}
          >
            Advanced editor
          </Link>
        }
      />

      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12 }}>
            <EmployerJobPostForm />
          </div>
        </div>
      </div>

      <div className="wa-hidden md:wa-block">
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', maxWidth: '42rem' }}>
          <EmployerJobPostForm />
        </div>
      </div>
    </PortalPageFrame>
  );
}
