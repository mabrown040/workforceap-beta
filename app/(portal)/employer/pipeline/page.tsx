import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerPipelineClient from '@/components/employer/EmployerPipelineClient';
import MobileBottomNav from '@/components/MobileBottomNav';

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

  const STAGES = [
    { key: 'matched', label: 'Matched' },
    { key: 'applied', label: 'Applied' },
    { key: 'interview', label: 'Interview' },
    { key: 'offer', label: 'Offer' },
    { key: 'hired', label: 'Hired' },
  ];

  const stageCounts = STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = allMatches.filter((m) => m.status === s.key).length;
    return acc;
  }, {});

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <>
      {/* ── Mobile section ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Candidate Pipeline</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>AI-matched candidates across your open roles</p>
        </div>

        {/* Stage scroll */}
        <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', padding: '0 1rem 0.875rem', scrollbarWidth: 'none' }}>
          {STAGES.map((stage) => (
            <div
              key={stage.key}
              style={{ flexShrink: 0, textAlign: 'center', padding: '0.625rem 1rem', background: 'var(--surface-container)', borderRadius: '0.75rem', minWidth: '80px' }}
            >
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-accent)' }}>{stageCounts[stage.key] ?? 0}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginTop: '0.125rem' }}>{stage.label}</div>
            </div>
          ))}
        </div>

        {/* Cards by job */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1rem' }}>
          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'var(--surface-container-low)', borderRadius: '0.875rem', border: '1px solid #ebe7e7' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>account_tree</span>
              <p style={{ fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.25rem' }}>No pipeline yet</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>Post a job to receive AI-matched candidates.</p>
              <Link href="/employer/jobs/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>Post a Job
              </Link>
            </div>
          ) : (
            jobs.map((job) => {
              const matches = byJob.get(job.id) ?? [];
              if (matches.length === 0) return null;
              return (
                <div key={job.id}>
                  <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.5rem' }}>{job.title}</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {matches.map((m) => (
                      <div key={m.id} style={{ background: '#fff', borderRadius: '0.75rem', padding: '0.875rem 1rem', border: '1px solid #ebe7e7', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 1px 3px rgba(28,27,27,0.05)' }}>
                        <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', background: '#fff1f2', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(m.student.fullName ?? '?')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="truncate" style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>{m.student.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{m.student.enrolledProgram ?? 'No program'}</div>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>{Math.round(m.matchScore * 100)}%</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-on-surface-variant)', textTransform: 'capitalize' }}>{m.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <MobileBottomNav variant="employer" />
      </div>

      {/* ── Desktop section ── */}
      <div className="wa-hidden wa-md:wa-block">
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
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Post a job to receive suggested candidates here.</p>
          ) : allMatches.length === 0 ? (
            <p style={{ color: 'var(--color-on-surface-variant)' }}>
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
      </div>
    </>
  );
}
