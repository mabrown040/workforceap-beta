import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import JobForm from '@/components/employer/JobForm';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Post New Job',
  description: 'Create a new job posting.',
  path: '/employer/jobs/new',
});
}

export default async function NewJobPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/new');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: { companyName: true },
  });

  const active = await getActivePrograms();
  const programSlugs = active.map((p) => p.slug);

  return (
    <PortalPageFrame>
      <PageHeader
        title="Create Job Posting"
        subtitle="Create a job posting. Save as draft or submit for admin review."
        breadcrumbs={[
          { label: 'Job Postings', href: '/employer/jobs' },
          { label: 'Create Job Posting' },
        ]}
      />
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1rem', overflowY: 'auto' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12 }}>
            <JobForm companyName={employer?.companyName ?? ''} programSlugs={programSlugs} />
          </div>
        </div>
      </div>
      <div className="wa-hidden md:wa-block">
        <JobForm companyName={employer?.companyName ?? ''} programSlugs={programSlugs} />
      </div>
    </PortalPageFrame>
  );
}
