import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { prisma } from '@/lib/db/prisma';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import JobApplyButton from './JobApplyButton';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, status: 'live' },
    select: { title: true, description: true },
  });
  if (!job) return buildPageMetadata({ title: 'Job', description: '', path: `/jobs/${id}` });
  return buildPageMetadata({
    title: job.title,
    description: job.description?.slice(0, 160) ?? '',
    path: `/jobs/${id}`,
  });
}

async function getJob(id: string) {
  return prisma.job.findFirst({
    where: { id, status: 'live' },
    include: { employer: { select: { companyName: true } } },
  });
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

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
    <div className="inner-page">
      <PageHero
        title={job.title}
        subtitle={`${job.employer.companyName} · ${job.location ?? LOCATION_LABELS[job.locationType] ?? job.locationType} · ${JOB_TYPE_LABELS[job.jobType] ?? job.jobType}`}
      />
      <section className="content-section" style={{ paddingTop: '1rem' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/jobs" style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem' }}>
              ← Back to Job Board
            </Link>
          </div>

          {(job.salaryMin ?? job.salaryMax) && (
            <p style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              <strong>Salary:</strong> ${(job.salaryMin ?? 0).toLocaleString()} – ${(job.salaryMax ?? 0).toLocaleString()}/year
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

          <JobApplyButton jobId={job.id} />
        </div>
      </section>
      <Footer />
    </div>
  );
}
