import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import PageHeader from '@/components/portal/PageHeader';
import { prisma } from '@/lib/db/prisma';
import EmployerPipelineClient from '@/components/employer/EmployerPipelineClient';
import EmployerMatchStatusSelect from '@/components/employer/EmployerMatchStatusSelect';
import MobileBottomNav from '@/components/MobileBottomNav';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';
import StatusBadge from '@/components/portal/StatusBadge';
import { employerAiMatchStatusBadgeVariant, employerMatchPipelineLabel } from '@/lib/employer/aiMatchPipelineLabels';

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

  const PIPELINE_STRIP = [
    {
      label: 'New',
      count: allMatches.filter((m) =>
        ['suggested', 'employer_notified', 'student_notified'].includes(m.status)
      ).length,
    },
    { label: 'Contact', count: allMatches.filter((m) => m.status === 'contacted').length },
    { label: 'Interview', count: allMatches.filter((m) => m.status === 'interviewing').length },
    { label: 'Hired', count: allMatches.filter((m) => m.status === 'hired').length },
  ];

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <>
      <h1 className="wa-sr-only">Candidate Pipeline</h1>
      {/* ── Mobile section ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title="Candidate Pipeline"
          subtitle="AI-matched candidates across your open roles"
        />

        {/* Stage scroll */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0 1rem 0.875rem' }}>
          {PIPELINE_STRIP.map((stage) => (
            <div
              key={stage.label}
              className="portal-card portal-card--flat"
              style={{ flexShrink: 0, textAlign: 'center', padding: '0.625rem 1rem', minWidth: '80px' }}
            >
              <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-accent)' }}>{stage.count}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginTop: '0.125rem' }}>{stage.label}</div>
            </div>
          ))}
        </div>

        {/* Cards by job */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0 1rem' }}>
          {jobs.length === 0 ? (
            <div className="portal-card portal-card--flat" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>account_tree</span>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>No pipeline yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>Post a job to receive AI-matched candidates.</p>
              <Link href="/employer/jobs/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: 'var(--color-accent)', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>Post a Job
              </Link>
            </div>
          ) : allMatches.length === 0 ? (
            <div className="portal-card portal-card--flat" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '0.75rem' }}>psychology</span>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>No matches yet</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>AI matches will appear once your jobs are live.</p>
              <Link href="/employer/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: 'var(--surface-container-high)', color: 'var(--color-on-surface)', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                View Your Jobs
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
                      <div
                        key={m.id}
                        className="portal-card portal-card--flat"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', background: 'var(--surface-container-low)', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                            {getInitials(m.student.fullName ?? '?')}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="wa-truncate" style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>{m.student.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{m.student.enrolledProgram ?? 'No program'}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 0, maxWidth: '42%' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>{matchScoreAsPercent(m.matchScore)}%</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                              <StatusBadge
                                className="wa-truncate max-w-full"
                                label={employerMatchPipelineLabel(m.status)}
                                variant={employerAiMatchStatusBadgeVariant(m.status)}
                              />
                            </div>
                          </div>
                        </div>
                        <EmployerMatchStatusSelect jobId={job.id} studentId={m.student.id} initialStatus={m.status} compact />
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
        <PortalPageFrame>
          <PageHeader
            title="Candidate Pipeline"
            subtitle="Suggested matches from WorkforceAP. Update status as you progress intros and decisions."
            action={
              <Link href="/employer/jobs" style={{
                padding: '0.625rem 1.25rem',
                background: 'var(--surface-container-high)',
                color: 'var(--color-accent)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                Back to jobs
              </Link>
            }
          />

          {jobs.length === 0 ? (
            <div className="portal-card portal-card--flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '1rem' }}>account_tree</span>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>No pipeline yet</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
                Post a job to receive AI-matched candidates here.
              </p>
              <Link href="/employer/jobs/new" style={{
                padding: '0.625rem 1.25rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                Post your first job
              </Link>
            </div>
          ) : allMatches.length === 0 ? (
            <div className="portal-card portal-card--flat" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--outline-variant)', display: 'block', marginBottom: '1rem' }}>psychology</span>
              <h3 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem', color: 'var(--color-on-surface)' }}>No AI-suggested matches yet</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
                Matches appear here after admin runs job–candidate matching.
              </p>
              <Link href="/employer/jobs" style={{
                padding: '0.625rem 1.25rem',
                background: 'var(--surface-container-high)',
                color: 'var(--color-on-surface)',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}>
                View Your Jobs
              </Link>
            </div>
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
        </PortalPageFrame>
      </div>
    </>
  );
}
