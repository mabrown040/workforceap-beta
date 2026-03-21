import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import EmployerJobsBoard from '@/components/employer/EmployerJobsBoard';

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

  const boardItems = jobs.map((j) => {
    const desc = j.description?.trim() ?? '';
    return {
      id: j.id,
      title: j.title,
      location: j.location?.trim() || '—',
      descriptionPreview: desc.length > 220 ? `${desc.slice(0, 220).trim()}…` : desc || '—',
      status: j.status,
      statusLabel: STATUS_LABELS[j.status] ?? j.status,
      applicationsCount: j._count.applications,
      updatedAt: j.updatedAt,
    };
  });

  return (
    <div className="employer-jobs-page">
      <header className="employer-jobs-header">
        <h1>My Jobs</h1>
        <div className="employer-jobs-actions">
          <Link href="/employer/jobs/import" className="btn btn-primary btn-sm">
            Import
          </Link>
          <Link href="/employer/jobs/new" className="btn btn-secondary btn-sm">
            Post Job
          </Link>
        </div>
      </header>
      <p className="employer-jobs-lead">
        Edit postings as cards below. Drafts can be submitted for review; live jobs can be marked filled when you hire.
      </p>
      <EmployerJobsBoard jobs={boardItems} />
    </div>
  );
}
