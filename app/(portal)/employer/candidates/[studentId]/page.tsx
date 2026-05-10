import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { CourseProgressStatus } from '@prisma/client';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { getEmployerForUser } from '@/lib/auth/roles';
import { unlinkedEmployerHref } from '@/lib/auth/portalGuards';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';
import { getProgramBySlug } from '@/lib/content/programs';
import StatusBadge from '@/components/portal/StatusBadge';
import { employerAiMatchStatusBadgeVariant, employerMatchPipelineLabel } from '@/lib/employer/aiMatchPipelineLabels';
import {
  employerJobPostingApplicationStatusBadgeVariant,
  employerJobPostingApplicationStatusLabel,
} from '@/lib/employer/jobPostingApplicationStatus';
import PortalPageFrame from '@/components/portal/PortalPageFrame';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { isSyncStale, staleSyncMessage } from '@/lib/sync/syncStatus';
import { getTranslations } from 'next-intl/server';

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams?: Promise<{ jobId?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ studentId: string }>;
}): Promise<Metadata> {
  const { studentId } = await params;
  const t = await getTranslations('employer');
  return buildPageMetadataAsync({
    title: t('candidateProfile'),
    description: 'WorkforceAP member profile for your hiring pipeline.',
    path: `/employer/candidates/${studentId}`,
  });
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) return '—';
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function EmployerCandidateProfilePage({
  params,
  searchParams,
}: Props) {
  const { studentId } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?redirectTo=/employer/candidates/${studentId}`);

  const ctx = await getEmployerForUser(user.id);
  if (!ctx) redirect(await unlinkedEmployerHref(user.id));

  const t = await getTranslations('employer');

  const sp = (await searchParams) ?? {};
  const highlightJobId = typeof sp.jobId === 'string' ? sp.jobId : null;

  const [matches, applications] = await Promise.all([
    prisma.aIJobMatch.findMany({
      where: { studentId, job: { employerId: ctx.employerId, status: 'live' } },
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

  const [student, partnerReferral, counselorAssign] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: {
        fullName: true,
        email: true,
        enrolledProgram: true,
        assessmentCompleted: true,
        courseEnrollments: {
          select: { programSlug: true, isPrimary: true, enrolledAt: true },
          orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'asc' }],
        },
        memberProgramProgress: {
          select: { programSlug: true, averagePercent: true, coursesCompleted: true },
        },
        courseProgress: {
          select: { programSlug: true, courseSlug: true, status: true, percentComplete: true, lastUpdatedAt: true },
        },
        userCertifications: {
          select: { certName: true, earnedAt: true },
          orderBy: { earnedAt: 'desc' },
        },
        profile: {
          select: {
            profileLinkedin: true,
            profileBio: true,
            employmentStatus: true,
          },
        },
      },
    }),
    prisma.partnerReferral.findFirst({
      where: { memberId: studentId },
      include: { partner: { select: { name: true } } },
    }),
    prisma.counselorAssignment.findFirst({
      where: { memberId: studentId, active: true },
      include: { counselor: { select: { id: true, user: { select: { fullName: true } } } } },
    }),
  ]);

  if (!student) notFound();

  const enrollmentTitles = student.courseEnrollments.map(
    (row) => getProgramBySlug(row.programSlug)?.title ?? row.programSlug,
  );
  const enrolledProgramTitle = student.enrolledProgram
    ? getProgramBySlug(student.enrolledProgram)?.title ?? student.enrolledProgram
    : null;
  const programDisplay = enrollmentTitles.length > 0
    ? Array.from(new Set(enrollmentTitles)).join(' · ')
    : enrolledProgramTitle ?? '—';

  const trainingProgramSlug = student.enrolledProgram;
  const trainingProgram = trainingProgramSlug ? getProgramBySlug(trainingProgramSlug) : null;
  const trainingRollupPct = memberProgramProgressPct(trainingProgramSlug, null, student.memberProgramProgress);
  const trainingCourseRows = trainingProgramSlug
    ? student.courseProgress.filter((r) => r.programSlug === trainingProgramSlug)
    : [];
  const lastSyncAt = trainingCourseRows.length > 0
    ? trainingCourseRows.reduce((latest, r) => (r.lastUpdatedAt > latest ? r.lastUpdatedAt : latest), trainingCourseRows[0].lastUpdatedAt)
    : null;
  const trainingCourseBySlug = new Map(trainingCourseRows.map((r) => [r.courseSlug, r]));

  const selectedMatch = (highlightJobId ? matches.find((match) => match.jobId === highlightJobId) : null) ?? matches[0] ?? null;
  const topMatchPct = selectedMatch ? matchScoreAsPercent(selectedMatch.matchScore) : null;
  const latestApplication = applications[0] ?? null;
  const activeRoles = new Map([...matches, ...applications].map((item) => [item.jobId, item.job.title]));
  const summaryStats = [
    { label: t('applicationsCount'), value: applications.length },
    { label: t('aiMatches'), value: matches.length },
    { label: t('rolesInPipeline'), value: activeRoles.size },
  ];

  return (
    <>
      <div className="md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        <PageHeader
          title={student.fullName ?? t('candidateProfile')}
          subtitle={t('sharedBecauseMatched')}
          action={(
            <Link
              href="/employer/matches"
              style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)', textDecoration: 'none' }}
            >
              {t('backToMatches')}
            </Link>
          )}
        />

        <div style={{ padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                  {t('candidateSnapshot')}
                </p>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0.35rem 0 0.2rem' }}>{student.fullName}</h1>
                <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: '0.875rem', overflowWrap: 'anywhere' }}>{student.email}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
                {summaryStats.map((stat) => (
                  <div key={stat.label} style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>{stat.value}</div>
                    <div style={{ fontSize: '0.65rem', lineHeight: 1.25, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              {selectedMatch ? (
                <div style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'color-mix(in srgb, var(--color-accent) 8%, white)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                        {t('highlightedRole')}
                      </p>
                      <p style={{ margin: '0.35rem 0 0', fontWeight: 700, color: 'var(--color-on-surface)' }}>{selectedMatch.job.title}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent)' }}>{topMatchPct}%</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('matchPercent')}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.6rem' }}>
                    <StatusBadge
                      label={employerMatchPipelineLabel(selectedMatch.status)}
                      variant={employerAiMatchStatusBadgeVariant(selectedMatch.status)}
                    />
                  </div>
                </div>
              ) : null}
              {(partnerReferral || counselorAssign) ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                  {partnerReferral ? (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface)', background: 'var(--surface-container)', padding: '0.35rem 0.6rem', borderRadius: '0.5rem' }}>
                      {t('referredBy')} {partnerReferral.partner.name}
                    </span>
                  ) : null}
                  {counselorAssign ? (
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface)', background: 'var(--surface-container)', padding: '0.35rem 0.6rem', borderRadius: '0.5rem' }}>
                      {t('counselorLabel')}: {counselorAssign.counselor.user.fullName}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
              {t('readiness')}
            </p>
            <div style={{ display: 'grid', gap: '0.6rem', marginTop: '0.75rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{t('program')}</p>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{programDisplay}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{t('assessment')}</p>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{student.assessmentCompleted ? t('completed') : t('notCompleted')}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{t('employmentStatus')}</p>
                <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>{student.profile?.employmentStatus ?? '—'}</p>
              </div>
              {student.profile?.profileLinkedin ? (
                <a href={student.profile.profileLinkedin} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)', fontWeight: 700, textDecoration: 'none' }}>
                  Open LinkedIn profile →
                </a>
              ) : null}
            </div>
          </section>

          <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
              {t('trainingProgress')}
            </p>
            <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.45 }}>
              CourseProgress and MemberProgramProgress from Coursera for Business sync (same sources as the partner referral view).
            </p>
            {isSyncStale(lastSyncAt) && (
              <div
                style={{
                  marginTop: '0.75rem',
                  background: 'rgba(217,119,6,0.08)',
                  border: '1px solid rgba(217,119,6,0.25)',
                  borderRadius: '0.75rem',
                  padding: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--color-warning)', fontSize: '1rem' }}>schedule</span>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                  {staleSyncMessage(lastSyncAt)}
                </p>
              </div>
            )}
            {!trainingProgramSlug ? (
              <p style={{ margin: '0.75rem 0 0', fontWeight: 700 }}>{t('notEnrolled')}</p>
            ) : (
              <>
                <div style={{ marginTop: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>Program rollup</p>
                  <p style={{ margin: '0.2rem 0 0', fontWeight: 700 }}>
                    {trainingRollupPct}% · {trainingProgram?.title ?? trainingProgramSlug}
                  </p>
                </div>
                {trainingProgram ? (
                  <ul style={{ margin: '0.65rem 0 0', padding: 0, listStyle: 'none' }}>
                    {trainingProgram.courses.map((course) => {
                      const row = trainingCourseBySlug.get(course.slug);
                      const done =
                        row?.status === CourseProgressStatus.COMPLETED || (row?.percentComplete ?? 0) >= 100;
                      const pct = row?.percentComplete ?? 0;
                      return (
                        <li key={course.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                          {done ? (
                            <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} aria-hidden />
                          ) : (
                            <span
                              aria-hidden
                              style={{
                                display: 'inline-block',
                                width: 18,
                                height: 18,
                                border: '2px solid var(--outline-variant)',
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span style={{ flex: 1 }}>
                            {course.name}
                            {!done ? (
                              <span style={{ color: 'var(--color-on-surface-variant)' }}>
                                {row ? ` — ${pct}%` : ' — not started'}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p style={{ margin: '0.65rem 0 0', color: 'var(--color-on-surface-variant)' }}>
                    Program catalog not found for this slug.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
              {t('certifications')}
            </p>
            {student.userCertifications.length === 0 ? (
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>No certifications on file.</p>
            ) : (
              <ul style={{ margin: '0.65rem 0 0', padding: 0, listStyle: 'none' }}>
                {student.userCertifications.map((cert) => (
                  <li key={cert.certName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-green)', flexShrink: 0 }}>verified</span>
                    <span style={{ flex: 1, fontSize: '0.78rem' }}>
                      {cert.certName}
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>{cert.earnedAt ? ` · ${formatDateTime(cert.earnedAt)}` : ''}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {student.memberProgramProgress.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-on-surface-variant)' }}>{t('courses')}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {student.memberProgramProgress.map((prog) => (
                    <span key={prog.programSlug} style={{ fontSize: '0.78rem' }}>
                      {getProgramBySlug(prog.programSlug)?.title ?? prog.programSlug}: {prog.averagePercent}% · {prog.coursesCompleted} course{prog.coursesCompleted === 1 ? '' : 's'} completed
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {student.profile?.profileBio ? (
            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                Candidate summary
              </p>
              <p style={{ margin: '0.75rem 0 0', lineHeight: 1.55, color: 'var(--color-on-surface-variant)' }}>{student.profile.profileBio}</p>
            </section>
          ) : null}

          {matches.length > 0 ? (
            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                AI match history
              </p>
              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                {matches.map((match) => (
                  <div key={match.id} style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <Link href={`/employer/jobs/${match.jobId}`} style={{ fontWeight: 700, color: 'var(--color-on-surface)', textDecoration: 'none' }}>
                          {match.job.title}
                        </Link>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                          Added {formatDateTime(match.createdAt)}
                        </p>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-accent)', flexShrink: 0 }}>
                        {matchScoreAsPercent(match.matchScore)}%
                      </div>
                    </div>
                    <div style={{ marginTop: '0.55rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <StatusBadge
                        label={employerMatchPipelineLabel(match.status)}
                        variant={employerAiMatchStatusBadgeVariant(match.status)}
                      />
                      {highlightJobId === match.jobId ? (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--color-accent)' }}>Current focus</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {applications.length > 0 ? (
            <section className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>
                {t('applicationsCount')}
              </p>
              <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
                {applications.map((application) => (
                  <div key={application.id} style={{ padding: '0.85rem', borderRadius: '0.75rem', background: 'var(--surface-container-low)' }}>
                    <Link href={`/employer/jobs/${application.jobId}`} style={{ fontWeight: 700, color: 'var(--color-on-surface)', textDecoration: 'none' }}>
                      {application.job.title}
                    </Link>
                    <div style={{ marginTop: '0.35rem' }}>
                      <StatusBadge
                        label={employerJobPostingApplicationStatusLabel(application.status)}
                        variant={employerJobPostingApplicationStatusBadgeVariant(application.status)}
                      />
                    </div>
                    <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
                      {application.status === 'rejected' ? 'Submitted' : 'Applied'} {formatDateTime(application.appliedAt)}
                      {application.status === 'rejected' && <span style={{ marginLeft: '0.5rem', color: 'var(--color-accent)' }}>· Outcome: declined</span>}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.65rem' }}>
            <Link
              href="/employer/pipeline"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.8rem',
                background: 'var(--color-accent)',
                color: '#fff',
                borderRadius: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t('openPipeline')}
            </Link>
            <Link
              href="/employer/messages"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '0.8rem',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                borderRadius: '0.75rem',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              {t('messageCandidate')}
            </Link>
          </div>
        </div>

      </div>

      <div className="wa-hidden md:wa-block">
        <PortalPageFrame>
          <PageHeader
            title={student.fullName ?? t('candidateProfile')}
            subtitle={t('sharedBecauseMatched')}
            action={
              <Link href="/employer/matches" className="btn btn-outline btn-sm">
                {t('backToMatches')}
              </Link>
            }
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(320px, 0.7fr)', gap: '1rem', alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)' }}>{t('candidateSnapshot')}</p>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.35rem 0 0.2rem' }}>{student.fullName}</h2>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', overflowWrap: 'anywhere' }}>{student.email}</p>
                    {(partnerReferral || counselorAssign) ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
                        {partnerReferral ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-on-surface)', background: 'var(--surface-container)', padding: '0.3rem 0.55rem', borderRadius: '0.5rem' }}>
                            {t('referredBy')} {partnerReferral.partner.name}
                          </span>
                        ) : null}
                        {counselorAssign ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-on-surface)', background: 'var(--surface-container)', padding: '0.3rem 0.55rem', borderRadius: '0.5rem' }}>
                            {t('counselorLabel')}: {counselorAssign.counselor.user.fullName}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {selectedMatch ? (
                    <div style={{ minWidth: '8.5rem', padding: '0.9rem 1rem', borderRadius: '0.9rem', background: 'color-mix(in srgb, var(--color-accent) 10%, white)' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-accent)' }}>{topMatchPct}%</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>top match</div>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                  {summaryStats.map((stat) => (
                    <div key={stat.label} style={{ padding: '0.9rem', borderRadius: '0.9rem', background: 'var(--surface-container-low)' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{stat.value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>Program and readiness</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('program')}</p>
                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{programDisplay}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('assessment')}</p>
                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{student.assessmentCompleted ? t('completed') : t('notCompleted')}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('employmentStatus')}</p>
                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{student.profile?.employmentStatus ?? '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>LinkedIn</p>
                    {student.profile?.profileLinkedin ? (
                      <a href={student.profile.profileLinkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '0.3rem', fontWeight: 700 }}>
                        Open profile
                      </a>
                    ) : (
                      <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>—</p>
                    )}
                  </div>
                </div>
                {student.profile?.profileBio ? (
                  <p style={{ margin: '1rem 0 0', lineHeight: 1.6, color: 'var(--color-on-surface-variant)' }}>{student.profile.profileBio}</p>
                ) : null}
              </div>

              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{t('trainingProgress')}</h2>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
                  CourseProgress and MemberProgramProgress from Coursera for Business sync (same sources as the partner referral view).
                </p>
                {isSyncStale(lastSyncAt) && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      background: 'rgba(217,119,6,0.08)',
                      border: '1px solid rgba(217,119,6,0.25)',
                      borderRadius: '0.75rem',
                      padding: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-warning)', fontSize: '1rem' }}>schedule</span>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                      {staleSyncMessage(lastSyncAt)}
                    </p>
                  </div>
                )}
                {!trainingProgramSlug ? (
                  <p style={{ margin: '0.85rem 0 0', fontWeight: 700 }}>{t('notEnrolled')}</p>
                ) : (
                  <>
                    <div style={{ marginTop: '0.85rem' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Program rollup</p>
                      <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>
                        {trainingRollupPct}% · {trainingProgram?.title ?? trainingProgramSlug}
                      </p>
                    </div>
                    {trainingProgram ? (
                      <ul style={{ margin: '0.75rem 0 0', padding: 0, listStyle: 'none' }}>
                        {trainingProgram.courses.map((course) => {
                          const row = trainingCourseBySlug.get(course.slug);
                          const done =
                            row?.status === CourseProgressStatus.COMPLETED || (row?.percentComplete ?? 0) >= 100;
                          const pct = row?.percentComplete ?? 0;
                          return (
                            <li key={course.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                              {done ? (
                                <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} aria-hidden />
                              ) : (
                                <span
                                  aria-hidden
                                  style={{
                                    display: 'inline-block',
                                    width: 18,
                                    height: 18,
                                    border: '2px solid var(--outline-variant)',
                                    borderRadius: 4,
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <span style={{ flex: 1 }}>
                                {course.name}
                                {!done ? (
                                  <span style={{ color: 'var(--color-on-surface-variant)' }}>
                                    {row ? ` — ${pct}%` : ' — not started'}
                                  </span>
                                ) : null}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p style={{ margin: '0.75rem 0 0', color: 'var(--color-on-surface-variant)' }}>
                        Program catalog not found for this slug.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{t('certifications')}</h2>
                {student.userCertifications.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>No certifications on file.</p>
                ) : (
                  <ul style={{ margin: '0.65rem 0 0', padding: 0, listStyle: 'none' }}>
                    {student.userCertifications.map((cert) => (
                      <li key={cert.certName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.45rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: 'var(--color-green)', flexShrink: 0 }}>verified</span>
                        <span style={{ flex: 1, fontSize: '0.85rem' }}>
                          {cert.certName}
                          <span style={{ color: 'var(--color-on-surface-variant)' }}>{cert.earnedAt ? ` · ${formatDateTime(cert.earnedAt)}` : ''}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {student.memberProgramProgress.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('courses')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                      {student.memberProgramProgress.map((prog) => (
                        <span key={prog.programSlug} style={{ fontSize: '0.85rem' }}>
                          {getProgramBySlug(prog.programSlug)?.title ?? prog.programSlug}: {prog.averagePercent}% · {prog.coursesCompleted} course{prog.coursesCompleted === 1 ? '' : 's'} completed
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {matches.length > 0 ? (
                <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                  <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>AI match history</h2>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {matches.map((match) => (
                      <div key={match.id} style={{ padding: '0.95rem 1rem', borderRadius: '0.9rem', background: 'var(--surface-container-low)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/employer/jobs/${match.jobId}`} style={{ fontWeight: 700 }}>{match.job.title}</Link>
                            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                              Added {formatDateTime(match.createdAt)}
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-accent)' }}>{matchScoreAsPercent(match.matchScore)}%</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t('matchPercent')}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.65rem' }}>
                          <StatusBadge
                            label={employerMatchPipelineLabel(match.status)}
                            variant={employerAiMatchStatusBadgeVariant(match.status)}
                          />
                          {highlightJobId === match.jobId ? <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>Current focus</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {applications.length > 0 ? (
                <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                  <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>{t('applicationsCount')}</h2>
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {applications.map((application) => (
                      <div key={application.id} style={{ padding: '0.95rem 1rem', borderRadius: '0.9rem', background: 'var(--surface-container-low)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <Link href={`/employer/jobs/${application.jobId}`} style={{ fontWeight: 700 }}>{application.job.title}</Link>
                            <p style={{ margin: '0.3rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                              {application.status === 'rejected' ? 'Submitted' : 'Applied'} {formatDateTime(application.appliedAt)}
                              {application.status === 'rejected' && <span style={{ marginLeft: '0.5rem', color: 'var(--color-accent)' }}>· Outcome: declined</span>}
                            </p>
                          </div>
                          <StatusBadge
                            label={employerJobPostingApplicationStatusLabel(application.status)}
                            variant={employerJobPostingApplicationStatusBadgeVariant(application.status)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <aside style={{ display: 'grid', gap: '1rem' }}>
              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>{t('nextBestAction')}</h2>
                {selectedMatch ? (
                  <>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      Review the {selectedMatch.job.title} match first, then decide whether to move this candidate forward in your pipeline.
                    </p>
                    <div style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
                      <Link href={`/employer/jobs/${selectedMatch.jobId}`} className="btn btn-primary">{t('openRole')}</Link>
                      <Link href="/employer/messages" className="btn btn-outline">{t('messageCandidate')}</Link>
                    </div>
                  </>
                ) : latestApplication ? (
                  <>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
                      This member has already applied. Review the application status and keep outreach moving.
                    </p>
                    <div style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
                      <Link href={`/employer/jobs/${latestApplication.jobId}`} className="btn btn-primary">{t('openLatestApplication')}</Link>
                      <Link href="/employer/pipeline" className="btn btn-outline">{t('openPipeline')}</Link>
                    </div>
                  </>
                ) : null}
              </div>

              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem' }}>
                <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.9rem' }}>{t('pipelineNotes')}</h2>
                <div style={{ display: 'grid', gap: '0.85rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('highlightedRole')}</p>
                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{selectedMatch?.job.title ?? latestApplication?.job.title ?? '—'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('latestApplication')}</p>
                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>{latestApplication ? formatDateTime(latestApplication.appliedAt) : 'No application yet'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{t('profileCompleteness')}</p>
                    <p style={{ margin: '0.3rem 0 0', fontWeight: 700 }}>
                      {student.profile?.profileBio || student.profile?.profileLinkedin ? t('strongEnough') : t('lightProfile')}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </PortalPageFrame>
      </div>
    </>
  );
}
