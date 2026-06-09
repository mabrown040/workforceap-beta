import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import PageHero from '@/components/PageHero';
import MobileApplyFunnel from './MobileApplyFunnel';
import { formatJobSalaryRange } from '@/lib/jobs/formatSalary';
import { resolveSupabasePublicAssetUrl } from '@/lib/storage/publicAssetUrl';
import PageHeader from '@/components/portal/PageHeader';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let job = null;
  try {
    job = await prisma.job.findFirst({
      where: { id, status: 'live' },
      select: { title: true, description: true },
    });
  } catch {
    job = null;
  }
  if (!job) return buildPageMetadataAsync({ title: 'Job', description: '', path: `/dashboard/jobs/${id}` });
  return buildPageMetadataAsync({
    title: job.title,
    description: job.description?.slice(0, 160) ?? '',
    path: `/dashboard/jobs/${id}`,
  });
}

async function getJob(id: string) {
  try {
    return await prisma.job.findFirst({
      where: { id, status: 'live' },
      include: { employer: { select: { companyName: true, logoUrl: true } } },
    });
  } catch {
    return null;
  }
}

export default async function JobDetailPage({ params }: Props) {
  const user = await getUser();
  const { id } = await params;

  const job = await getJob(id);
  if (!job) notFound();

  const employerLogoUrl = resolveSupabasePublicAssetUrl('employer-logos', job.employer.logoUrl);
  const salaryLine = formatJobSalaryRange(job.salaryMin, job.salaryMax);

  const LOCATION_LABELS: Record<string, string> = {
    remote: 'Remote',
    hybrid: 'Hybrid',
    onsite: 'On-site',
  };
  const JOB_TYPE_LABELS: Record<string, string> = {
    fulltime: 'Full-time',
    parttime: 'Part-time',
    contract: 'Contract',
  };

  return (
    <>
    <div className="inner-page">
      <PageHeader
        title="Job Details"
        breadcrumbs={[
          { label: 'Job Board', href: '/dashboard/jobs' },
          { label: 'Job Details' },
        ]}
      />
      <PageHero
        title={job.title}
        subtitle={`${job.employer.companyName} · ${job.location ?? LOCATION_LABELS[job.locationType] ?? job.locationType} · ${JOB_TYPE_LABELS[job.jobType] ?? job.jobType}`}
      >
        {employerLogoUrl ? (
          <div style={{ marginTop: '0.75rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={employerLogoUrl}
              alt=""
              width={72}
              height={72}
              style={{ objectFit: 'contain', borderRadius: 8, background: 'var(--surface-container-low)' }}
            />
          </div>
        ) : null}
      </PageHero>
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/dashboard/jobs" style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
              ← Back to Job Board
            </Link>
          </div>

          {salaryLine && (
            <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              <strong>Salary:</strong> {salaryLine}
            </p>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Description</h2>
            <div style={{ whiteSpace: 'pre-wrap' }}>{job.description}</div>
          </div>

          {job.requirements?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Requirements</h2>
              <ul style={{ paddingLeft: '1.25rem' }}>
                {job.requirements.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <MobileApplyFunnel
            jobId={job.id}
            authenticated={!!user}
            jobTitle={job.title}
            employerName={job.employer.companyName}
            salaryLine={salaryLine}
            location={job.location ?? LOCATION_LABELS[job.locationType] ?? job.locationType}
            jobType={JOB_TYPE_LABELS[job.jobType] ?? job.jobType}
          />
        </div>
      </section>
    </div>    </>
  );
}
