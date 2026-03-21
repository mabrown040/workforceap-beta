import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import EmployerJobsBoard from '@/components/employer/EmployerJobsBoard';
import { assessJobPostingReadiness } from '@/lib/employer/jobReadiness';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Jobs',
  description: 'Manage your job postings.',
  path: '/employer/jobs',
});

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'In review',
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
    const location = j.location?.trim() || '';
    const readiness = assessJobPostingReadiness({
      location: location || '—',
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      description: desc,
      requirementsCount: j.requirements?.length ?? 0,
      suggestedProgramsCount: j.suggestedPrograms?.length ?? 0,
    });
    return {
      id: j.id,
      title: j.title,
      location: location || '—',
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      locationType: j.locationType,
      jobType: j.jobType,
      descriptionPreview: desc.length > 180 ? `${desc.slice(0, 180).trim()}…` : desc || '—',
      descriptionLength: desc.length,
      requirementsCount: j.requirements?.length ?? 0,
      suggestedProgramsCount: j.suggestedPrograms?.length ?? 0,
      status: j.status,
      statusLabel: STATUS_LABELS[j.status] ?? j.status,
      applicationsCount: j._count.applications,
      updatedAt: j.updatedAt,
      readinessLevel: readiness.level,
      readinessIssues: readiness.issues,
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
            Add from careers page
          </Link>
          <Link href="/employer/jobs/new" className="btn btn-secondary btn-sm">
            New posting
          </Link>
        </div>
      </header>
      <p className="employer-jobs-lead">
        Scan by stage, tighten drafts before you send them, and bulk-clean what you do not need. Live and board-approved
        postings stay protected until you mark a role filled.
      </p>
      <EmployerJobsBoard jobs={boardItems} />
    </div>
  );
}
