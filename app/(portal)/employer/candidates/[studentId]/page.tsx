import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import MobileBottomNav from '@/components/MobileBottomNav';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  const { studentId } = await params;
  return buildPageMetadata({
    title: 'Candidate profile',
    description: 'WorkforceAP member profile for your hiring pipeline.',
    path: `/employer/candidates/${studentId}`,
  });
}

export default async function EmployerCandidateProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams?: Promise<{ jobId?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login');

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect('/employers');

  const { studentId } = await params;
  const sp = (await searchParams) ?? {};
  const highlightJobId = typeof sp.jobId === 'string' ? sp.jobId : null;

  const [matches, applications] = await Promise.all([
    prisma.aIJobMatch.findMany({
      where: { studentId, job: { employerId: ctx.employerId } },
      orderBy: { createdAt: 'desc' },
      include: {
        job: { select: { id: true, title: true } },
      },
    }),
    prisma.jobPostingApplication.findMany({
      where: { studentId, job: { employerId: ctx.employerId } },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: { select: { id: true, title: true } },
      },
    }),
  ]);

  if (matches.length === 0 && applications.length === 0) {
    notFound();
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      fullName: true,
      email: true,
      enrolledProgram: true,
      assessmentCompleted: true,
      profile: {
        select: {
          profileLinkedin: true,
          profileBio: true,
          employmentStatus: true,
        },
      },
    },
  });

  if (!student) notFound();

  return (
    <>
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <div style={{ padding: '1rem 1rem 0.75rem' }}>
          <Link
            href="/employer/matches"
            style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' }}
          >
            ← Match history
          </Link>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.75rem 0 0.25rem' }}>{student.fullName}</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>{student.email}</p>
        </div>
        <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #ebe7e7' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>Program</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{student.enrolledProgram ?? '—'}</p>
          </div>
          {matches.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #ebe7e7' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>AI matches</p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {matches.map((m) => (
                  <li key={m.id} style={{ marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600 }}>{m.job.title}</span>
                    {' · '}
                    <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                      {matchScoreAsPercent(m.matchScore)}% match · {m.status.replace(/_/g, ' ')}
                    </span>
                    {highlightJobId === m.jobId ? (
                      <span style={{ marginLeft: '0.35rem', fontSize: '0.7rem', color: 'var(--color-accent)', fontWeight: 700 }}>(selected)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {applications.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #ebe7e7' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '0.5rem' }}>Applications</p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {applications.map((a) => (
                  <li key={a.id} style={{ marginBottom: '0.35rem' }}>
                    <Link href={`/employer/jobs/${a.jobId}`} style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                      {a.job.title}
                    </Link>
                    {' · '}
                    <span style={{ textTransform: 'capitalize' }}>{a.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link
            href="/employer/pipeline"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.75rem',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: '0.5rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Open pipeline
          </Link>
        </div>
        <MobileBottomNav variant="employer" />
      </div>

      <div className="wa-hidden wa-md:wa-block">
        <PageHeader
          title={student.fullName ?? 'Candidate'}
          subtitle="Profile shared because this member matched or applied to your roles."
          action={
            <Link href="/employer/matches" className="btn btn-outline btn-sm">
              Back to matches
            </Link>
          }
        />
        <div style={{ display: 'grid', gap: '1rem', maxWidth: '720px' }}>
          <div className="stitch-card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Contact</h2>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong> {student.email}
            </p>
            {student.profile?.profileLinkedin ? (
              <p style={{ margin: '0.5rem 0 0' }}>
                <strong>LinkedIn:</strong>{' '}
                <a href={student.profile.profileLinkedin} target="_blank" rel="noopener noreferrer">
                  Profile
                </a>
              </p>
            ) : null}
          </div>
          <div className="stitch-card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Program & readiness</h2>
            <p style={{ margin: 0 }}>
              <strong>Enrolled program:</strong> {student.enrolledProgram ?? '—'}
            </p>
            <p style={{ margin: '0.5rem 0 0' }}>
              <strong>Assessment:</strong> {student.assessmentCompleted ? 'Completed' : 'Not completed'}
            </p>
            {student.profile?.employmentStatus ? (
              <p style={{ margin: '0.5rem 0 0' }}>
                <strong>Employment status:</strong> {student.profile.employmentStatus}
              </p>
            ) : null}
            {student.profile?.profileBio ? (
              <p style={{ margin: '0.75rem 0 0', lineHeight: 1.5, color: 'var(--color-on-surface-variant)' }}>{student.profile.profileBio}</p>
            ) : null}
          </div>
          {matches.length > 0 ? (
            <div className="stitch-card" style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>AI matches</h2>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {matches.map((m) => (
                  <li key={m.id} style={{ marginBottom: '0.5rem' }}>
                    <Link href={`/employer/jobs/${m.jobId}`} style={{ fontWeight: 600 }}>
                      {m.job.title}
                    </Link>
                    {' — '}
                    {matchScoreAsPercent(m.matchScore)}% · {m.status.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {applications.length > 0 ? (
            <div className="stitch-card" style={{ padding: '1.25rem' }}>
              <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Applications</h2>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {applications.map((a) => (
                  <li key={a.id} style={{ marginBottom: '0.5rem' }}>
                    <Link href={`/employer/jobs/${a.jobId}`} style={{ fontWeight: 600 }}>
                      {a.job.title}
                    </Link>
                    {' — '}
                    <span style={{ textTransform: 'capitalize' }}>{a.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
