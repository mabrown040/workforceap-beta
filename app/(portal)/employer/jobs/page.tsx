import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import JobsTable from '@/components/employer/JobsTable';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Jobs',
  description: 'Manage your job postings.',
  path: '/employer/jobs',
});

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  live: 'Live',
  filled: 'Filled',
  closed: 'Closed',
};

export default async function EmployerJobsPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const jobs = await prisma.job.findMany({
    where: { employerId: ctx.employerId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { applications: true } } },
  });

  const items = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    location: j.location ?? '—',
    locationType: j.locationType,
    status: j.status,
    statusLabel: STATUS_LABELS[j.status] ?? j.status,
    applicationsCount: j._count.applications,
    updatedAt: j.updatedAt,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>My Jobs</h1>
        <Link href="/employer/jobs/new" className="btn btn-primary">
          Post New Job
        </Link>
      </div>
      <JobsTable jobs={items} />
    </div>
  );
}
