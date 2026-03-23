import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerPipelineClient from '@/components/employer/EmployerPipelineClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Candidate pipeline',
  description: 'AI-suggested matches for your open roles.',
  path: '/employer/pipeline',
});

export default async function EmployerPipelinePage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/pipeline');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const jobs = await prisma.job.findMany({
    where: { employerId: ctx.employerId },
    select: { id: true, title: true },
    orderBy: { updatedAt: 'desc' },
  });

  const jobIds = jobs.map((j) => j.id);
  const allMatches =
    jobIds.length === 0
      ? []
      : await prisma.aIJobMatch.findMany({
          where: { jobId: { in: jobIds } },
          orderBy: [{ jobId: 'asc' }, { matchScore: 'desc' }],
          include: {
            student: { select: { id: true, fullName: true, email: true, enrolledProgram: true } },
          },
        });

  const byJob = new Map<string, typeof allMatches>();
  for (const m of allMatches) {
    const list = byJob.get(m.jobId) ?? [];
    list.push(m);
    byJob.set(m.jobId, list);
  }

  return (
    <div className="employer-pipeline-page">
      <PageHeader
        title="Candidate pipeline"
        subtitle="Suggested matches from WorkforceAP. Update status as you progress intros and decisions."
        action={
          <Link href="/employer/jobs" className="btn btn-secondary btn-sm">
            Back to jobs
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <p style={{ color: 'var(--color-gray-600)' }}>Post a job to receive suggested candidates here.</p>
      ) : allMatches.length === 0 ? (
        <p style={{ color: 'var(--color-gray-600)' }}>
          No AI-suggested matches yet. Matches appear here after admin runs job–candidate matching.
        </p>
      ) : (
        <div className="employer-pipeline-jobs">
          {jobs.map((job) => {
            const matches = byJob.get(job.id) ?? [];
            if (matches.length === 0) return null;
            const initialMatches = matches.map((m) => ({
              id: m.id,
              matchScore: m.matchScore,
              matchReasons: m.matchReasons,
              status: m.status,
              student: m.student,
            }));
            return (
              <EmployerPipelineClient
                key={job.id}
                jobId={job.id}
                jobTitle={job.title}
                initialMatches={initialMatches}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
