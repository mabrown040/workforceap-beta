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
        <div className="employer-jobs-header-text">
          <h1>Job postings</h1>
          <p className="employer-jobs-kicker">Drafts, review, and live roles candidates see on the Austin-area board.</p>
        </div>
        <div className="employer-jobs-actions">
          <Link href="/employer/jobs/import" className="btn btn-primary btn-sm">
            Import from careers page
          </Link>
          <Link href="/employer/jobs/new" className="btn btn-secondary btn-sm">
            Post a job
          </Link>
        </div>
      </header>
      <p className="employer-jobs-lead">
        Use filters and bulk select to clean up drafts. Anything live or already approved for the board is protected from bulk delete — mark it filled first.
      </p>
      <EmployerJobsBoard jobs={boardItems} />
    </div>
  );
}
