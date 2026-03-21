import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import JobForm from '@/components/employer/JobForm';
import { assessJobPostingReadiness, readinessLabel } from '@/lib/employer/jobReadiness';

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

  const editReadiness = assessJobPostingReadiness({
    location: job.location?.trim() || '—',
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: job.description?.trim() ?? '',
    requirementsCount: job.requirements?.length ?? 0,
    suggestedProgramsCount: job.suggestedPrograms?.length ?? 0,
  });

  return (
    <article className="employer-job-edit">
      <div className="employer-job-edit__back">
        <Link href="/employer/jobs">← Back to jobs</Link>
      </div>
      <header className="employer-job-edit__header">
        <h1>{job.title}</h1>
        <span className="employer-job-edit__meta">
          {job.status}
          {job.applicationsCount > 0 && ` · ${job.applicationsCount} application${job.applicationsCount === 1 ? '' : 's'}`}
        </span>
      </header>
      {(job.status === 'draft' || job.status === 'pending') && editReadiness.issues.length > 0 && (
        <div className={`employer-job-edit-readiness employer-job-edit-readiness--${editReadiness.level}`}>
          <p className="employer-job-edit-readiness__label">{readinessLabel(editReadiness.level)}</p>
          <p className="employer-job-edit-readiness__intro">
            {job.status === 'pending'
              ? 'You can still edit while WorkforceAP reviews — tightening these items helps candidates self-select.'
              : 'Strong postings get faster review and better matches. Here is what is still light:'}
          </p>
          <ul className="employer-job-edit-readiness__list">
            {editReadiness.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
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
        }}
        companyName={employer?.companyName ?? ''}
        programSlugs={PROGRAMS.map((p) => p.slug)}
      />
    </article>
  );
}
