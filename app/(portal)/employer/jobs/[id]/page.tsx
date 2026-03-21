import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import JobForm from '@/components/employer/JobForm';

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

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/employer/jobs" style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
          ← Back to My Jobs
        </Link>
      </div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Edit: {job.title}</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        Status: {job.status}. {job.applicationsCount} application(s).
      </p>
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
    </div>
  );
}
