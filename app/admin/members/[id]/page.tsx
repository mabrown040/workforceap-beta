import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Prisma } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadata } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getDefaultOrganizationId } from '@/lib/tenant/organization';
import { memberTrainingProfileComplete } from '@/lib/platform/trainingEnrollmentGate';
import StaffMemberResumePanel from '@/components/counselor/StaffMemberResumePanel';
import { ASSESSMENT_QUESTIONS } from '@/lib/assessment/answer-key';
import MemberDetailActions from '@/components/admin/MemberDetailActions';
import AdminMemberDbActions from '@/components/admin/AdminMemberDbActions';
import MemberPartnerSection from '@/components/admin/MemberPartnerSection';
import MemberSubgroupSection from '@/components/admin/MemberSubgroupSection';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import AdminMemberCounselorAssign from '@/components/admin/AdminMemberCounselorAssign';
import AdminMemberPlacedOutcomeForm from '@/components/admin/AdminMemberPlacedOutcomeForm';
import AdminMemberEnrollmentFundingForm from '@/components/admin/AdminMemberEnrollmentFundingForm';
import CreateSuccessToast from './CreateSuccessToast';
import { formatPhone } from '@/lib/formatPhone';
import { getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import { ClipboardList, CheckCircle } from 'lucide-react';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import type { WioaReviewStatus } from '@/lib/wioa/wioaReview';
import AdminMemberWioaReviewPanel from '@/components/admin/AdminMemberWioaReviewPanel';
import PageHeader from '@/components/portal/PageHeader';
import AdminMemberAiMatches from './AdminMemberAiMatches';
import '@/css/counselor.css';

export const metadata: Metadata = buildPageMetadata({
  title: 'Member Detail',
  description: 'View and manage member.',
  path: '/admin/members',
});

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const { id } = await params;

  const fullMemberSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    deletedAt: true,
    enrolledProgram: true,
    enrolledAt: true,
    programChangedAt: true,
    coursesCompleted: true,
    assessmentCompleted: true,
    assessmentCompletedAt: true,
    assessmentScore: true,
    assessmentScorePct: true,
    programInterest: true,
    assessmentAnswers: true,
    interviewEligible: true,
    interviewRequestedAt: true,
    interviewCompletedAt: true,
    workspaceEmail: true,
    workspaceEmailProvisioned: true,
    wioaQualificationJson: true,
    wioaReviewStatus: true,
    wioaReviewedAt: true,
    wioaReviewedByUserId: true,
    wioaReviewNotes: true,
    profile: true,
    learningProgress: true,
    userCertifications: true,
    aiJobMatches: {
      include: {
        job: {
          include: {
            employer: true,
          },
        },
      },
    },
  } as const;

  const fallbackMemberSelect = {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    deletedAt: true,
    enrolledProgram: true,
    enrolledAt: true,
    programChangedAt: true,
    coursesCompleted: true,
    assessmentCompleted: true,
    assessmentCompletedAt: true,
    assessmentScore: true,
    assessmentScorePct: true,
    programInterest: true,
    assessmentAnswers: true,
    interviewEligible: true,
    interviewRequestedAt: true,
    interviewCompletedAt: true,
    workspaceEmail: true,
    workspaceEmailProvisioned: true,
    profile: true,
  } as const;

  const placementRecordSafeSelect = {
    id: true,
    userId: true,
    employerName: true,
    jobTitle: true,
    startDate: true,
    salaryOffered: true,
    placedAt: true,
    placedBy: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  const sharedQueries = () => [
    prisma.partner.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.partnerReferral.findFirst({
      where: { memberId: id },
      select: { partnerId: true },
    }),
    prisma.subgroup.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    }),
    prisma.memberSubgroup.findMany({
      where: { memberId: id },
      select: { subgroupId: true },
    }),
    prisma.counselor.findMany({
      where: { active: true },
      orderBy: [{ partner: { name: 'asc' } }, { user: { fullName: 'asc' } }],
      include: {
        user: { select: { fullName: true } },
        partner: { select: { name: true } },
      },
    }),
    prisma.counselorAssignment.findFirst({
      where: { memberId: id, active: true },
      include: { counselor: { select: { userId: true, user: { select: { fullName: true } } } } },
    }),
    prisma.placementRecord.findUnique({ where: { userId: id }, select: placementRecordSafeSelect }).catch(() => null),
    prisma.courseEnrollment.findUnique({
      where: { userId: id },
      select: {
        fundingSource: true,
        fundingNotes: true,
        workspaceEmail: true,
        workspaceEmailProvisioned: true,
      },
    }).catch(() => null),
  ] as const;

  let member: any;
  let partners: any;
  let partnerReferral: any;
  let subgroups: any;
  let memberSubgroups: any;
  let counselorRows: any;
  let activeCounselorAssign: any;
  let placedOutcomeRow: any;
  let courseEnrollment: any;

  try {
    [member, partners, partnerReferral, subgroups, memberSubgroups, counselorRows, activeCounselorAssign, placedOutcomeRow, courseEnrollment] =
      await Promise.all([
        prisma.user.findUnique({ where: { id }, select: fullMemberSelect }),
        ...sharedQueries(),
      ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? '');
    const looksLikeSchemaDrift =
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      /wioa_|learning_progress|user_certifications|ai_job_matches|a_i_job_matches|organization_program_catalog/i.test(message);

    if (!looksLikeSchemaDrift) throw error;

    console.error('[admin/member-detail] falling back after optional data query failed', error);

    [member, partners, partnerReferral, subgroups, memberSubgroups, counselorRows, activeCounselorAssign, placedOutcomeRow, courseEnrollment] =
      await Promise.all([
        prisma.user.findUnique({ where: { id }, select: fallbackMemberSelect }),
        ...sharedQueries(),
      ]);

    if (member) {
      member = {
        ...member,
        learningProgress: [],
        userCertifications: [],
        aiJobMatches: [],
        wioaQualificationJson: null,
        wioaReviewStatus: null,
        wioaReviewedAt: null,
        wioaReviewedByUserId: null,
        wioaReviewNotes: null,
      };
    }
  }

  if (!member || member.deletedAt) notFound();

  let wioaReviewerName: string | null = null;
  if (member.wioaReviewedByUserId) {
    const rev = await prisma.user.findUnique({
      where: { id: member.wioaReviewedByUserId },
      select: { fullName: true },
    });
    wioaReviewerName = rev?.fullName ?? null;
  }

  const preScreening = await prisma.preScreeningResponse.findUnique({
    where: { userId: member.id },
  });

  const organizationId = await getDefaultOrganizationId();
  const catalogPrograms = await prisma.organizationProgramCatalog.findMany({
    where: { organizationId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { programSlug: true, name: true, status: true },
  });
  const programOptions =
    catalogPrograms.length > 0
      ? catalogPrograms.map((r) => ({ slug: r.programSlug, name: r.name, status: r.status }))
      : null;

  const gate = memberTrainingProfileComplete({
    phone: member.phone,
    profilePhone: member.profile?.profilePhone,
    profileAddress: member.profile?.profileAddress,
    financialAidInterest: member.profile?.financialAidInterest,
  });
  const profileIncomplete = !gate.ok;

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const coursesCompleted = (member.coursesCompleted as string[] | null) ?? [];
  const completedCount = program ? coursesCompleted.filter((s) => program.courses.some((c) => c.slug === s)).length : 0;
  const assessmentAnswers = member.assessmentAnswers as Record<number, string> | null;
  const chatThread = await getOrCreateMemberCounselorThread(member.id);
  const chatMsgs = await prisma.message.findMany({
    where: { threadId: chatThread.id },
    orderBy: { createdAt: 'asc' },
  });
  const chatAuthorIds = [...new Set(chatMsgs.map((m) => m.authorId))];
  const chatAuthors =
    chatAuthorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: chatAuthorIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const chatNameById = new Map(chatAuthors.map((n) => [n.id, n.fullName]));

  const wioaSnap = parseWioaQualificationSnapshot(member.wioaQualificationJson);

  const counselorChatInitial = {
    staffUserId: user.id,
    member: { id: member.id, fullName: member.fullName },
    thread: {
      id: chatThread.id,
      memberId: chatThread.memberId,
      counselorUserId: chatThread.counselorUserId,
      memberLastReadAt: chatThread.memberLastReadAt?.toISOString() ?? null,
      counselorLastReadAt: chatThread.counselorLastReadAt?.toISOString() ?? null,
    },
    messages: chatMsgs.map((m) => ({
      ...serializeMessage(m),
      authorName: chatNameById.get(m.authorId) ?? 'User',
    })),
  };

  return (
    <div>
      <Suspense fallback={null}>
        <CreateSuccessToast />
      </Suspense>
      <PageHeader
        breadcrumbs={[{ label: 'Members', href: '/admin/members' }, { label: 'Member Details' }]}
        title={member.fullName}
        subtitle={member.email}
        action={
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href={`/admin/members/${id}/lifecycle`} className="btn btn-outline">
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', marginRight: '0.25rem', verticalAlign: 'middle' }} aria-hidden="true">timeline</span>
              Lifecycle
            </Link>
            <Link href={`/admin/members/${id}/readiness`} className="btn btn-outline">
              <ClipboardList size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Readiness
            </Link>
            <Link href="/admin/members" className="btn btn-outline">← Back to Members</Link>
          </div>
        }
      />

      <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '800px' }}>
        {/* Admin DB actions — password reset, profile edit */}
        <section className="portal-profile-section-card">
          <div className="portal-profile-section-card__header">
            <h2 className="portal-profile-section-card__title">Admin Actions</h2>
            <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Super admin</span>
          </div>
          <div className="portal-profile-section-card__body">
            <AdminMemberDbActions
              memberId={id}
              memberName={member.fullName}
              memberEmail={member.email}
              currentFullName={member.fullName}
              currentPhone={member.phone}
              currentProfilePhone={member.profile?.profilePhone ?? null}
              currentProfileAddress={member.profile?.profileAddress ?? null}
              currentProfileBio={member.profile?.profileBio ?? null}
              currentProfileLinkedin={member.profile?.profileLinkedin ?? null}
            />
          </div>
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Profile</h2>
          <p><strong>Phone:</strong> {formatPhone(member.phone ?? member.profile?.profilePhone)}</p>
          <p><strong>Address:</strong> {member.profile?.profileAddress ?? member.profile?.address ?? '—'}</p>
          <p>
            <strong>Financial aid interest:</strong>{' '}
            {member.profile?.financialAidInterest === true
              ? 'Yes'
              : member.profile?.financialAidInterest === false
                ? 'No'
                : '—'}
          </p>
          <p><strong>LinkedIn:</strong> {member.profile?.profileLinkedin ? <a href={member.profile.profileLinkedin} target="_blank" rel="noopener noreferrer">{member.profile.profileLinkedin}</a> : '—'}</p>
          <p><strong>Bio:</strong> {member.profile?.profileBio ?? '—'}</p>
        </section>

        {wioaSnap && (
          <AdminMemberWioaReviewPanel
            memberId={member.id}
            snapshot={wioaSnap}
            reviewStatus={(member.wioaReviewStatus as WioaReviewStatus | null) ?? null}
            reviewedAt={member.wioaReviewedAt?.toISOString() ?? null}
            reviewerName={wioaReviewerName}
            reviewNotes={member.wioaReviewNotes}
          />
        )}

        {preScreening && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Pre-screening</h2>
            <p><strong>Employment:</strong> {preScreening.employmentStatus}</p>
            <p><strong>Primary goal:</strong> {preScreening.primaryGoal}</p>
            <p><strong>Weekly hours:</strong> {preScreening.weeklyHours}</p>
            <p><strong>Barrier:</strong> {preScreening.barrier}</p>
            <p><strong>Heard about us:</strong> {preScreening.hearAbout}{preScreening.hearAboutOther ? ` — ${preScreening.hearAboutOther}` : ''}</p>
            <p><strong>Workforce assistance:</strong> {preScreening.workforceAssistance ? 'Yes' : 'No'}</p>
            <p><strong>Submitted:</strong> {preScreening.createdAt.toLocaleString()}</p>
            <p><strong>Interview eligible:</strong> {member.interviewEligible ? 'Yes' : 'No'}</p>
            {member.interviewRequestedAt && (
              <p><strong>Interview requested:</strong> {member.interviewRequestedAt.toLocaleString()}</p>
            )}
            {member.interviewCompletedAt && (
              <p><strong>Interview completed:</strong> {member.interviewCompletedAt.toLocaleString()}</p>
            )}
          </section>
        )}

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Program</h2>
          <p><strong>Enrolled:</strong> {program?.title ?? member.enrolledProgram ?? '—'}</p>
          <p><strong>Enrolled date:</strong> {member.enrolledAt?.toLocaleDateString() ?? '—'}</p>
          <p><strong>Course progress:</strong> {completedCount} of {program?.courses.length ?? 0} complete</p>
          
          {member.learningProgress && member.learningProgress.length > 0 && (
            <div style={{ marginTop: '1rem', background: 'var(--surface-container-low)', padding: '1rem', borderRadius: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Active Training Data (External)</h3>
              {member.learningProgress.map((lp: any) => (
                <div key={lp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{lp.pathwayId}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '100px', height: '6px', background: 'var(--surface-container-highest)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${lp.progress}%`, height: '100%', background: lp.completed ? 'var(--color-green)' : 'var(--color-accent)' }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{lp.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', listStyle: 'none' }}>
            {program?.courses.map((c) => (
              <li key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {coursesCompleted.includes(c.slug) ? <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} /> : <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid var(--outline-variant)', borderRadius: 4, flexShrink: 0 }} />}
                {c.name}
              </li>
            ))}
          </ul>

          {member.userCertifications && member.userCertifications.length > 0 && (
            <div style={{ marginTop: '1.5rem', background: '#fff3cd', border: '1px solid #ffeeba', padding: '1rem', borderRadius: '0.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#856404' }}>⚠️ Unverified External Certifications</h3>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#856404' }}>
                {member.userCertifications.map((cert: any) => (
                  <li key={cert.id}>
                    <strong>{cert.certName}</strong> (Earned: {new Date(cert.earnedAt).toLocaleDateString()})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <MemberDetailActions
            userId={member.id}
            memberName={member.fullName}
            profileIncomplete={profileIncomplete}
            currentProgramSlug={member.enrolledProgram}
            assessmentCompleted={member.assessmentCompleted}
            programOptions={programOptions ?? []}
          />
        </section>

        <MemberPartnerSection
          memberId={member.id}
          partners={partners}
          currentPartnerId={partnerReferral?.partnerId ?? null}
        />

        <MemberSubgroupSection
          memberId={member.id}
          subgroups={subgroups}
          currentSubgroupIds={memberSubgroups.map((ms: any) => ms.subgroupId)}
        />

        <AdminMemberAiMatches memberId={member.id} matches={member.aiJobMatches} />

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Counselor assignment</h2>
          {activeCounselorAssign?.counselor ? (
            <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Current: <strong>{activeCounselorAssign.counselor.user.fullName}</strong>
            </p>
          ) : (
            <p style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: 'var(--color-on-surface-variant)' }}>
              No active counselor assignment.
            </p>
          )}
          <AdminMemberCounselorAssign
            memberId={member.id}
            counselors={counselorRows.map((c: any) => ({
              userId: c.userId,
              fullName: c.user.fullName,
              partnerName: c.partner?.name ?? 'WorkforceAP',
            }))}
            currentCounselorUserId={activeCounselorAssign?.counselor.userId ?? null}
          />
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 className="portal-section-heading">Placement record</h2>
          <AdminMemberPlacedOutcomeForm
            memberId={member.id}
            initial={
              placedOutcomeRow
                ? {
                    employerName: placedOutcomeRow.employerName,
                    jobTitle: placedOutcomeRow.jobTitle,
                    startingSalary: placedOutcomeRow.salaryOffered,
                    placedAt: placedOutcomeRow.placedAt.toISOString(),
                    programSlug: (placedOutcomeRow as { programSlug?: string | null }).programSlug ?? null,
                    notes: placedOutcomeRow.notes,
                    wageAtFollowUp: (placedOutcomeRow as { wageAtFollowUp?: number | null }).wageAtFollowUp ?? null,
                    retentionStatus: (placedOutcomeRow as { retentionStatus?: string | null }).retentionStatus ?? null,
                    startDateVerified: (placedOutcomeRow as { startDateVerified?: boolean }).startDateVerified ?? false,
                    fundingSource: (placedOutcomeRow as { fundingSource?: string | null }).fundingSource ?? null,
                    grantReportingNotes: (placedOutcomeRow as { grantReportingNotes?: string | null }).grantReportingNotes ?? null,
                  }
                : null
            }
          />
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Enrollment funding &amp; workspace</h2>
          {!courseEnrollment && (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
              Member is not currently enrolled in a program. Enrollment must be created first.
            </p>
          )}
          <AdminMemberEnrollmentFundingForm
            memberId={member.id}
            initial={
              courseEnrollment
                ? {
                    fundingSource: courseEnrollment.fundingSource,
                    fundingNotes: courseEnrollment.fundingNotes,
                    workspaceEmail: courseEnrollment.workspaceEmail ?? member.workspaceEmail ?? null,
                    workspaceEmailProvisioned:
                      courseEnrollment.workspaceEmailProvisioned || member.workspaceEmailProvisioned,
                  }
                : {
                    fundingSource: null,
                    fundingNotes: null,
                    workspaceEmail: member.workspaceEmail ?? null,
                    workspaceEmailProvisioned: member.workspaceEmailProvisioned,
                  }
            }
          />
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <AdminMemberCounselorChatClient initial={counselorChatInitial} messagingSurface="admin" />
        </section>

        {(member.profile?.resumeOriginalPath || member.profile?.resumeEnhancedPath) && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Resumes</h2>
            <StaffMemberResumePanel memberId={member.id} />
          </section>
        )}

        {member.assessmentCompleted && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Assessment</h2>
            <p><strong>Score:</strong> {member.assessmentScore ?? 0}/90 ({member.assessmentScorePct ?? 0}%)</p>
            <p><strong>Date:</strong> {member.assessmentCompletedAt?.toLocaleDateString() ?? '—'}</p>
            <p><strong>Program interest:</strong> {member.programInterest ?? '—'}</p>
            <details style={{ marginTop: '0.75rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Full Q&A</summary>
              {assessmentAnswers && (
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                  {ASSESSMENT_QUESTIONS.map((q) => (
                    <li key={q.id}>Q{q.id}: {q.question} → {assessmentAnswers[q.id] ?? '—'}</li>
                  ))}
                </ul>
              )}
            </details>
          </section>
        )}
      </div>
    </div>
  );
}
