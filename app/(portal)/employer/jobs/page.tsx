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

  // Group counts for the hierarchy summary
  const counts = {
    draft: jobs.filter((j) => j.status === 'draft').length,
    inReview: jobs.filter((j) => j.status === 'pending' || j.status === 'approved').length,
    live: jobs.filter((j) => j.status === 'live').length,
    filled: jobs.filter((j) => j.status === 'filled' || j.status === 'closed').length,
  };

  return (
    <div className="employer-jobs-page">
      <header className="employer-jobs-header">
        <div className="employer-jobs-header-text">
          <h1>Job postings</h1>
          <p className="employer-jobs-kicker">
            {jobs.length === 0
              ? 'Create your first posting to start hiring.'
              : `${counts.draft} draft${counts.draft === 1 ? '' : 's'} · ${counts.inReview} in review · ${counts.live} live · ${counts.filled} filled/closed`}
          </p>
        </div>
        <div className="employer-jobs-actions">
          <Link href="/employer/jobs/import" className="btn btn-outline btn-sm">
            Import
          </Link>
          <Link href="/employer/jobs/new" className="btn btn-primary btn-sm">
            Create posting
          </Link>
        </div>
      </header>
      <p className="employer-jobs-lead">
        Drafts stay private. Submit for review when ready, and we will publish after a quick check. 
        Live postings appear on the public board. Mark filled when the role closes.
      </p>
      <EmployerJobsBoard jobs={boardItems} />
    </div>
  );
}
