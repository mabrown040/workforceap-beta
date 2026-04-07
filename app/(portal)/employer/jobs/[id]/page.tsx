import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import JobForm from '@/components/employer/JobForm';
import JobReadinessIssueList from '@/components/employer/JobReadinessIssueList';
import { assessJobPostingReadiness, readinessLabel } from '@/lib/employer/jobReadiness';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    select: { title: true },
  });
  return buildPageMetadata({
    title: job ? `Edit: ${job.title}` : 'Edit Job',
    description: 'Edit job posting.',
    path: `/employer/jobs/${id}`,
  });
}

export default async function EmployerJobDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, employerId: ctx.employerId },
  });

  if (!job) notFound();

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: { companyName: true },
  });

  const active = await getActivePrograms();
  const programSlugs = active.map((p) => p.slug);

  const editReadiness = assessJobPostingReadiness({
    location: job.location?.trim() || '—',
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: job.description?.trim() ?? '',
    requirementsCount: job.requirements?.length ?? 0,
    suggestedProgramsCount: job.suggestedPrograms?.length ?? 0,
  });

  return (
    <>
    <article className="employer-job-edit wa-pb-24 wa-md:wa-pb-0">
      <PageHeader
        title="Job Details"
        breadcrumbs={[
          { label: 'Job Postings', href: '/employer/jobs' },
          { label: 'Job Details' },
        ]}
      />
      <div className="employer-job-edit__back">
        <Link href="/employer/jobs">← My Jobs</Link>
      </div>
      <header className="employer-job-edit__header">
        <h1>{job.title}</h1>
        <span className="employer-job-edit__meta">
          {job.status}
          {job.applicationsCount > 0 && ` · ${job.applicationsCount} application${job.applicationsCount === 1 ? '' : 's'}`}
        </span>
      </header>
      <JobForm
        job={{
          id: job.id,
          title: job.title,
          location: job.location,
          locationType: job.locationType,
          jobType: job.jobType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          description: job.description,
          requirements: job.requirements,
          preferredCertifications: job.preferredCertifications,
          suggestedPrograms: job.suggestedPrograms,
          status: job.status,
          sourceUrl: job.sourceUrl,
          importProvider: job.importProvider,
          importMethod: job.importMethod,
        }}
        companyName={employer?.companyName ?? ''}
        programSlugs={programSlugs}
      />
    </article>
    <MobileBottomNav variant="employer" />
    </>
  );
}
