import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { isAdmin, isCounselor } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import PageHeader from '@/components/portal/PageHeader';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import Link from 'next/link';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import MobileBottomNav from '@/components/MobileBottomNav';
import { counselorStudentStatusBadge, counselorStudentStatusBadgeVariant } from '@/lib/counselor/memberStatus';
import StatusBadge from '@/components/portal/StatusBadge';
import { getProgramBySlug } from '@/lib/content/programs';
import { parseCourseSlugList } from '@/lib/member/parseCourseSlugList';
import CounselorNotesPanel from './CounselorNotesPanel';
import StaffMemberResumePanel from '@/components/counselor/StaffMemberResumePanel';
import WioaScreeningReadonly from '@/components/admin/WioaScreeningReadonly';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import {
  employerJobPostingApplicationStatusBadgeVariant,
  employerJobPostingApplicationStatusLabel,
} from '@/lib/employer/jobPostingApplicationStatus';
import {
  employerAiMatchStatusBadgeVariant,
  employerMatchPipelineLabel,
} from '@/lib/employer/aiMatchPipelineLabels';
import { matchScoreAsPercent } from '@/lib/employer/matchScoreDisplay';

type Props = { params: Promise<{ memberId: string }> };

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function CounselorStudentDetailPage({ params }: Props) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/counselor/students');

  if (!(await isCounselor(user.id)) && !(await isAdmin(user.id))) redirect('/dashboard');

  const { memberId } = await params;

  const [counselor, adminUser] = await Promise.all([
    prisma.counselor.findFirst({
      where: { userId: user.id, active: true },
    }),
    isAdmin(user.id),
  ]);
  if (!counselor && !adminUser) redirect('/dashboard');

  const member = await prisma.user.findFirst({
    where: { id: memberId, deletedAt: null },
    select: {
      id: true,
      fullName: true,
      email: true,
      enrolledProgram: true,
      programInterest: true,
      assessmentScorePct: true,
      coursesCompleted: true,
      wioaQualificationJson: true,
      wioaReviewStatus: true,
      wioaReviewedAt: true,
      wioaReviewedByUserId: true,
      wioaReviewNotes: true,
      profile: {
        select: {
          resumeOriginalPath: true,
          resumeEnhancedPath: true,
        },
      },
    },
  });
  if (!member) notFound();

  if (counselor) {
    const assign = await prisma.counselorAssignment.findFirst({
      where: { counselorId: counselor.id, memberId, active: true },
    });
    if (!assign) notFound();
  } else if (!adminUser) {
    notFound();
  }

  const [applications, aiMatches] = await Promise.all([
    prisma.jobPostingApplication.findMany({
      where: { studentId: memberId },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: { select: { id: true, title: true, employer: { select: { companyName: true } } } },
      },
    }),
    prisma.aIJobMatch.findMany({
      where: { studentId: memberId },
      orderBy: { matchScore: 'desc' },
      include: {
        job: { select: { id: true, title: true, employer: { select: { companyName: true } } } },
      },
    }),
  ]);

  const thread = await getOrCreateMemberCounselorThread(memberId);
  const messages = await prisma.message.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: 'asc' },
  });
  const authorIds = [...new Set(messages.map((m) => m.authorId))];
  const authors =
    authorIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, fullName: true } })
      : [];
  const nameById = new Map(authors.map((a) => [a.id, a.fullName]));

  const initials = getInitials(member.fullName ?? 'U');
  const program = member.enrolledProgram ?? member.programInterest ?? '—';
  const enrollmentBadge = counselorStudentStatusBadge({
    enrolledProgram: member.enrolledProgram,
    assessmentScorePct: member.assessmentScorePct,
  });
  const enrollmentBadgeVariant = counselorStudentStatusBadgeVariant({
    enrolledProgram: member.enrolledProgram,
    assessmentScorePct: member.assessmentScorePct,
  });

  // Program progress — real data from enrolled program courses
  const programMeta = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const programCourses = programMeta?.courses ?? [];
  const completedSlugs = new Set(parseCourseSlugList(member.coursesCompleted));
  const progressPct = programCourses.length > 0
    ? Math.round((programCourses.filter((c) => completedSlugs.has(c.slug)).length / programCourses.length) * 100)
    : 0;

  const hasResumeFiles =
    !!(member.profile?.resumeOriginalPath || member.profile?.resumeEnhancedPath);

  const wioaSnap = parseWioaQualificationSnapshot(member.wioaQualificationJson);
  let wioaReviewerName: string | null = null;
  if (member.wioaReviewedByUserId) {
    const rev = await prisma.user.findUnique({
      where: { id: member.wioaReviewedByUserId },
      select: { fullName: true },
    });
    wioaReviewerName = rev?.fullName ?? null;
  }

  return (
    <>
      {/* ── Mobile ─────────────────────────────────────────── */}
      <div className="wa-md:wa-hidden" style={{ paddingBottom: '6rem' }}>
        {/* Back nav */}
        <div style={{ padding: '1rem 1rem 0' }}>
          <Link
            href="/counselor/students"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-accent)',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
              arrow_back
            </span>
            All Members
          </Link>
        </div>

        {/* Student hero */}
        <div style={{ padding: '1rem' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '1rem',
              padding: '1.25rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              {/* Avatar */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '0.875rem',
                  background: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '1.25rem' }}>{initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  className="wa-truncate"
                  style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-on-surface)', margin: '0 0 0.125rem' }}
                >
                  {member.fullName}
                </h1>
                <p
                  className="wa-truncate"
                  style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}
                >
                  {program}
                </p>
                <StatusBadge label={enrollmentBadge.label} variant={enrollmentBadgeVariant} />
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              <Link
                href="/counselor/messages"
                className="btn btn-outline"
                style={{ flex: 1, fontSize: '0.8rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">chat</span>
                Message
              </Link>
              <button
                disabled
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '0.8rem', opacity: 0.5, cursor: 'not-allowed' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }} aria-hidden="true">
                  event
                </span>
                Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Program Progress */}
        <div style={{ padding: '0 1rem 1rem' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-on-surface)', margin: '0 0 1rem' }}>
              Program Progress
            </h3>
            {programCourses.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                {member.enrolledProgram ? 'No course data available for this program.' : 'Not enrolled in a program yet.'}
              </p>
            ) : (
              <>
                {/* Overall progress bar */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                      Overall Completion
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>{progressPct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-container)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-accent)', borderRadius: '9999px' }} />
                  </div>
                </div>
                {/* Course list */}
                {programCourses.map((course) => {
                  const done = completedSlugs.has(course.slug);
                  return (
                    <div
                      key={course.slug}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.8rem',
                        padding: '0.375rem 0',
                        borderTop: '1px solid var(--outline-variant)',
                        opacity: done ? 1 : 0.6,
                      }}
                    >
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>{course.name}</span>
                      {done ? (
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#166534' }} aria-hidden="true">check_circle</span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>Not started</span>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Counselor Notes */}
        <div style={{ padding: '0 1rem 1rem' }}>
          <CounselorNotesPanel memberId={member.id} />
        </div>

        {wioaSnap ? (
          <div style={{ padding: '0 1rem 1rem' }}>
            <WioaScreeningReadonly
              snapshot={wioaSnap}
              reviewStatus={member.wioaReviewStatus}
              reviewedAt={member.wioaReviewedAt?.toISOString() ?? null}
              reviewerName={wioaReviewerName}
              reviewNotes={member.wioaReviewNotes}
            />
          </div>
        ) : null}

        {hasResumeFiles ? (
          <div style={{ padding: '0 1rem 1.5rem' }}>
            <div
              style={{
                background: '#fff',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                border: '1px solid var(--outline-variant)',
              }}
            >
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-on-surface)', margin: '0 0 1rem' }}>
                Resumes
              </h3>
              <StaffMemberResumePanel memberId={member.id} />
            </div>
          </div>
        ) : null}

        {/* Job Pipeline */}
        <div style={{ padding: '0 1rem 1.5rem' }}>
          <div
            style={{
              background: '#fff',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              border: '1px solid var(--outline-variant)',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-on-surface)', margin: '0 0 1rem' }}>
              Job Pipeline
            </h3>

            {applications.length === 0 && aiMatches.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                No applications or AI matches yet.
              </p>
            ) : null}

            {applications.length > 0 ? (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Applications
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'var(--surface-container-low)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-on-surface)', margin: 0 }}>{app.job.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>{app.job.employer.companyName}</p>
                        </div>
                        <StatusBadge
                          label={employerJobPostingApplicationStatusLabel(app.status)}
                          variant={employerJobPostingApplicationStatusBadgeVariant(app.status)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {aiMatches.length > 0 ? (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  AI Matches
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {aiMatches.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        background: 'var(--surface-container-low)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-on-surface)', margin: 0 }}>{m.job.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>{m.job.employer.companyName}</p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>{matchScoreAsPercent(m.matchScore)}%</div>
                          <div style={{ marginTop: '0.25rem' }}>
                            <StatusBadge
                              label={employerMatchPipelineLabel(m.status)}
                              variant={employerAiMatchStatusBadgeVariant(m.status)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Desktop ─────────────────────────────────────────── */}
      <div className="wa-hidden wa-md:wa-block">
        <div className="portal-main-content">
          <Link
            href="/counselor/students"
            style={{ color: 'var(--color-accent)', marginBottom: '1rem', display: 'inline-block' }}
          >
            ← Back to members
          </Link>
          <PageHeader
            title={member.fullName}
            subtitle={member.email}
            breadcrumbs={[
              { label: 'Members', href: '/counselor/students' },
              { label: 'Member details' },
            ]}
          />

          {wioaSnap ? (
            <section style={{ marginTop: '1.5rem' }}>
              <WioaScreeningReadonly
                snapshot={wioaSnap}
                reviewStatus={member.wioaReviewStatus}
                reviewedAt={member.wioaReviewedAt?.toISOString() ?? null}
                reviewerName={wioaReviewerName}
                reviewNotes={member.wioaReviewNotes}
              />
            </section>
          ) : null}

          {hasResumeFiles ? (
            <section style={{ marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 700 }}>Resumes</h2>
              <div
                className="portal-card portal-card--flat"
                style={{ padding: '1.25rem', border: '1px solid var(--outline-variant)' }}
              >
                <StaffMemberResumePanel memberId={member.id} />
              </div>
            </section>
          ) : null}

          <section style={{ marginTop: '1.5rem' }}>
            <AdminMemberCounselorChatClient
              messagesApiBase={`/api/counselor/members/${member.id}/messages`}
              initial={{
                staffUserId: user.id,
                member: { id: member.id, fullName: member.fullName },
                thread: {
                  id: thread.id,
                  memberId: thread.memberId,
                  counselorUserId: thread.counselorUserId,
                  memberLastReadAt: thread.memberLastReadAt?.toISOString() ?? null,
                  counselorLastReadAt: thread.counselorLastReadAt?.toISOString() ?? null,
                },
                messages: messages.map((m) => ({
                  ...serializeMessage(m),
                  authorName: nameById.get(m.authorId) ?? 'User',
                })),
              }}
            />
          </section>

          {/* Job Pipeline — Desktop */}
          <section style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 700 }}>Job Pipeline</h2>
            {applications.length === 0 && aiMatches.length === 0 ? (
              <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', border: '1px solid var(--outline-variant)' }}>
                <p style={{ color: 'var(--color-on-surface-variant)' }}>No applications or AI matches yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {applications.length > 0 ? (
                  <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', border: '1px solid var(--outline-variant)' }}>
                    <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Applications</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {applications.map((app) => (
                        <div key={app.id} style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-container-low)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div>
                              <p style={{ fontWeight: 700, margin: 0 }}>{app.job.title}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>{app.job.employer.companyName}</p>
                            </div>
                            <StatusBadge
                              label={employerJobPostingApplicationStatusLabel(app.status)}
                              variant={employerJobPostingApplicationStatusBadgeVariant(app.status)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {aiMatches.length > 0 ? (
                  <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', border: '1px solid var(--outline-variant)' }}>
                    <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', color: 'var(--color-on-surface-variant)' }}>AI Matches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {aiMatches.map((m) => (
                        <div key={m.id} style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--surface-container-low)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <div>
                              <p style={{ fontWeight: 700, margin: 0 }}>{m.job.title}</p>
                              <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>{m.job.employer.companyName}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-accent)' }}>{matchScoreAsPercent(m.matchScore)}%</div>
                              <div style={{ marginTop: '0.25rem' }}>
                                <StatusBadge
                                  label={employerMatchPipelineLabel(m.status)}
                                  variant={employerAiMatchStatusBadgeVariant(m.status)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>

          {adminUser ? (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              <Link href={`/admin/members/${member.id}`} className="btn btn-outline btn-sm">
                Open full member record (admin)
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <MobileBottomNav variant="counselor" />
    </>
  );
}
