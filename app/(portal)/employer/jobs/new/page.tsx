import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getActivePrograms } from '@/lib/platform/programCatalog';
import JobForm from '@/components/employer/JobForm';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';

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

  const active = await getActivePrograms();
  const programSlugs = active.map((p) => p.slug);

  return (
    <>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div
          style={{
            padding: '1rem 1rem 1.25rem',
            borderBottom: '1px solid var(--surface-container-high)',
            background: 'var(--surface-container-low)',
          }}
        >
          <Link
            href="/employer/jobs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.85rem',
              color: 'var(--color-accent)',
              textDecoration: 'none',
              marginBottom: '0.75rem',
              fontWeight: 500,
            }}
          >
            ← My Jobs
          </Link>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Post New Job</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.2rem 0 0' }}>
            Create a job posting. Save as draft or submit for admin review.
          </p>
        </div>

        <div style={{ padding: '1rem', overflowY: 'auto' }}>
          <div className="stitch-card" style={{ padding: '1rem', borderRadius: 12 }}>
            <JobForm companyName={employer?.companyName ?? ''} programSlugs={programSlugs} />
          </div>
        </div>

        <MobileBottomNav variant="employer" />
      </div>

      <div className="wa-hidden wa-md:wa-block">
        <PageHeader
          title="Post New Job"
          subtitle="Create a job posting. Save as draft or submit for admin review."
          breadcrumbs={[
            { label: 'Job Postings', href: '/employer/jobs' },
            { label: 'New Job' },
          ]}
        />
        <JobForm companyName={employer?.companyName ?? ''} programSlugs={programSlugs} />
      </div>
    </>
  );
}
