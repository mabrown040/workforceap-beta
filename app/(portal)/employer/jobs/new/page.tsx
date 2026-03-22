import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { PROGRAMS } from '@/lib/content/programs';
import JobForm from '@/components/employer/JobForm';
import PageHeader from '@/components/portal/PageHeader';

export const metadata: Metadata = buildPageMetadata({
  title: 'Post New Job',
  description: 'Create a new job posting.',
  path: '/employer/jobs/new',
});

export default async function NewJobPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/new');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

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
      <PageHeader
        title="Post New Job"
        subtitle="Create a job posting. Save as draft or submit for admin review."
      />
      <JobForm
        companyName={employer?.companyName ?? ''}
        programSlugs={PROGRAMS.map((p) => p.slug)}
      />
    </div>
  );
}
