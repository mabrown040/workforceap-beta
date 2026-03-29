import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import EmployerMatchHistoryClient from '@/components/employer/EmployerMatchHistoryClient';
import MobileBottomNav from '@/components/MobileBottomNav';

export const metadata: Metadata = buildPageMetadata({
  title: 'Match history',
  description: 'Suggested candidates and your hiring pipeline actions.',
  path: '/employer/matches',
});

export default async function EmployerMatchesPage() {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/employer/matches');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const matches = await prisma.aIJobMatch.findMany({
    where: { job: { employerId: ctx.employerId } },
    orderBy: { createdAt: 'desc' },
    include: {
      job: { select: { id: true, title: true } },
      student: { select: { id: true, fullName: true } },
    },
  });

  const keys = matches.map((m) => ({ jobId: m.jobId, studentId: m.studentId }));
  const applications =
    keys.length === 0
      ? []
      : await prisma.jobPostingApplication.findMany({
          where: { OR: keys.map((k) => ({ jobId: k.jobId, studentId: k.studentId })) },
          select: { id: true, jobId: true, studentId: true },
        });
  const appByPair = new Map(applications.map((a) => [`${a.jobId}:${a.studentId}`, a.id]));

  const initialRows = matches.map((m) => ({
    id: m.id,
    jobId: m.jobId,
    studentId: m.studentId,
    status: m.status,
    matchScore: m.matchScore,
    createdAt: m.createdAt.toISOString(),
    statusUpdatedAt: m.statusUpdatedAt?.toISOString() ?? null,
    job: m.job,
    student: m.student,
    applicationId: appByPair.get(`${m.jobId}:${m.studentId}`) ?? null,
  }));

  // Unique job roles for filter chips
  const uniqueJobs = Array.from(new Map(initialRows.map((r) => [r.jobId, r.job.title])).entries());

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const matchScoreColor = (score: number) => {
    if (score >= 0.85) return '#166534';
    if (score >= 0.7) return '#854d0e';
    return '#584144';
  };

  return (
    <>
      {/* ── Mobile section ── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1rem 1rem 0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.25rem' }}>Match History</h1>
          <p style={{ fontSize: '0.8rem', color: '#584144', margin: 0 }}>AI-suggested candidates for your roles</p>
        </div>

        {/* Filter chips by job role */}
        {uniqueJobs.length > 1 && (
          <div style={{ overflowX: 'auto', display: 'flex', gap: '0.5rem', padding: '0 1rem 0.75rem', scrollbarWidth: 'none' }}>
            <span style={{ flexShrink: 0, padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: '#8c0f37', color: '#fff' }}>All Roles</span>
            {uniqueJobs.map(([jobId, title]) => (
              <span key={jobId} style={{ flexShrink: 0, padding: '0.375rem 0.875rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: '#f0edec', color: '#584144' }}>
                {title}
              </span>
            ))}
          </div>
        )}

        {/* Match cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0 1rem' }}>
          {initialRows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f6f3f2', borderRadius: '0.875rem', border: '1px solid #ebe7e7' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: '#debfc2', display: 'block', marginBottom: '0.75rem' }}>auto_awesome</span>
              <p style={{ fontWeight: 600, color: '#584144', marginBottom: '0.25rem' }}>No matches yet</p>
              <p style={{ fontSize: '0.8rem', color: '#8b7073', marginBottom: '1rem' }}>AI candidate matches will appear here once your jobs are live.</p>
              <Link href="/employer/jobs/new" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.625rem 1.25rem', background: '#8c0f37', color: '#fff', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>add</span>Post a Job
              </Link>
            </div>
          ) : (
            initialRows.map((row) => (
              <div key={row.id} style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #ebe7e7', boxShadow: '0 1px 4px rgba(28,27,27,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                  <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', background: '#fff1f2', color: '#8c0f37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(row.student.fullName ?? '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1b1b' }}>{row.student.fullName}</div>
                    <div className="truncate" style={{ fontSize: '0.75rem', color: '#584144' }}>{row.job.title}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: matchScoreColor(row.matchScore) }}>{Math.round(row.matchScore * 100)}%</div>
                    <div style={{ fontSize: '0.65rem', color: '#584144' }}>match</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/employer/pipeline`}
                    style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: '#f0edec', color: '#1c1b1b', borderRadius: '0.375rem', fontSize: '0.775rem', fontWeight: 600, textDecoration: 'none' }}
                    className="active:scale-95 transition-transform"
                  >
                    View Profile
                  </Link>
                  <Link
                    href={`/employer/messages`}
                    style={{ flex: 1, textAlign: 'center', padding: '0.5rem', background: '#fff1f2', color: '#8c0f37', borderRadius: '0.375rem', fontSize: '0.775rem', fontWeight: 600, textDecoration: 'none' }}
                    className="active:scale-95 transition-transform"
                  >
                    Contact
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
        <MobileBottomNav variant="employer" />
      </div>

      {/* ── Desktop section ── */}
      <div className="wa-hidden wa-md:wa-block">
        <div>
          <PageHeader
            title="Match history"
            subtitle="Track suggested members and update your pipeline status as you move from outreach to hire."
          />
          <EmployerMatchHistoryClient initialRows={initialRows} />
        </div>
      </div>
    </>
  );
}
