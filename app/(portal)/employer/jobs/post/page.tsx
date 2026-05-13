import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import EmployerJobPostForm from '@/components/employer/EmployerJobPostForm';
import { EMPLOYER_TIERS } from '@/lib/stripe/client';

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
    title: 'Post a Job',
    description: 'Publish a job posting.',
    path: '/employer/jobs/post',
  });
}

export default async function EmployerJobPostPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/jobs/post');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const employer = await prisma.employer.findUnique({
    where: { id: ctx.employerId },
    select: { tier: true },
  });
  const tierKey = (employer?.tier ?? 'basic') as keyof typeof EMPLOYER_TIERS;
  const tierConfig = EMPLOYER_TIERS[tierKey] ?? EMPLOYER_TIERS.basic;
  const jobLimit = tierConfig.jobLimit;

  const activeJobCount = await prisma.job.count({
    where: {
      employerId: ctx.employerId,
      status: { in: ['live', 'pending', 'draft'] },
    },
  });

  const atLimit = jobLimit !== Infinity && activeJobCount >= jobLimit;

  return (
    <PortalPageFrame>
      <PageHeader
        title="Post a job"
        subtitle="Publish to the job board. You can edit, pause, or close anytime from Job Postings."
        breadcrumbs={[
          { label: 'Job Postings', href: '/employer/jobs' },
          { label: 'Post a job' },
        ]}
        action={
          <Link
            href="/employer/jobs/new"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
            }}
          >
            Advanced editor
          </Link>
        }
      />

      {atLimit && (
        <div className="portal-card portal-card--flat portal-card--padded" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-gold)', background: 'rgba(234,179,8,0.06)' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 0.5rem' }}>
            Job limit reached
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1rem' }}>
            You have {activeJobCount} active job{activeJobCount !== 1 ? 's' : ''} on the {tierConfig.name} plan (limit: {jobLimit}). Upgrade to post more.
          </p>
          <Link href="/employer/billing" className="btn btn-primary">
            Upgrade plan
          </Link>
        </div>
      )}

      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1rem' }}>
          <div className="portal-card portal-card--flat" style={{ padding: '1rem', borderRadius: 12 }}>
            <EmployerJobPostForm />
          </div>
        </div>
      </div>

      <div className="wa-hidden md:wa-block">
        <div className="portal-card portal-card--flat" style={{ padding: '1.5rem', maxWidth: '42rem' }}>
          <EmployerJobPostForm />
        </div>
      </div>
    </PortalPageFrame>
  );
}
