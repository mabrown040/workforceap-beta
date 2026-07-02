import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Prisma } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { isMemberWioaVerified } from '@/lib/platform/trainingEnrollmentGate';
import AdminMemberResumeSection from '@/components/admin/AdminMemberResumeSection';
// Use the client-safe questions file — the "Full Q&A" details list only
// renders question text + recorded answer, no correctness check.
import { ASSESSMENT_QUESTIONS_PUBLIC as ASSESSMENT_QUESTIONS } from '@/lib/assessment/questions';
import MemberDetailActions from '@/components/admin/MemberDetailActions';
import MemberCourseraEnrollmentApproval from '@/components/admin/MemberCourseraEnrollmentApproval';
import AdminMemberDbActions from '@/components/admin/AdminMemberDbActions';
import AdminMemberQuickSummary from '@/components/admin/AdminMemberQuickSummary';
import AdminMemberSendLinks from '@/components/admin/AdminMemberSendLinks';
import MemberPartnerSection from '@/components/admin/MemberPartnerSection';
import MemberSubgroupSection from '@/components/admin/MemberSubgroupSection';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import AdminMemberCounselorAssign from '@/components/admin/AdminMemberCounselorAssign';
import AdminMemberPlacedOutcomeForm from '@/components/admin/AdminMemberPlacedOutcomeForm';
import AdminMemberEnrollmentFundingForm from '@/components/admin/AdminMemberEnrollmentFundingForm';
import AdminMemberWorkspaceEmail from '@/components/admin/AdminMemberWorkspaceEmail';
import { getWorkspaceEmailAvailability } from '@/lib/workspace-email/provider';
import CreateSuccessToast from './CreateSuccessToast';
import { formatPhone } from '@/lib/formatPhone';
import { compactStringIds, getMessageAuthorName, getOrCreateMemberCounselorThread, serializeMessage } from '@/lib/messages/counselorThread';
import { AlertTriangle, ClipboardList, CheckCircle } from 'lucide-react';
import { parseWioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import type { WioaReviewStatus } from '@/lib/wioa/wioaReview';
import AdminMemberWioaReviewPanel from '@/components/admin/AdminMemberWioaReviewPanel';
import PageHeader from '@/components/portal/PageHeader';
import AdminMemberAiMatches from './AdminMemberAiMatches';
import MemberProgressStrip from '@/components/portal/MemberProgressStrip';
import { loadLearnerProgressByUserId } from '@/lib/coursera/progressQueries';
import { getBoardSnapshot, SMALL_SAMPLE_THRESHOLD } from '@/lib/admin/boardOutcomes';
import MemberCourseraDiagnoseButton from '@/components/admin/MemberCourseraDiagnoseButton';
import AdminMemberSkillCheckpointPanel from '@/components/admin/AdminMemberSkillCheckpointPanel';
import { loadSkillMissionSummary } from '@/lib/member/skillMissions';
import { deriveCareerPlanSignal } from '@/lib/admin/careerPlanSignal';
type AdminCourseProgressRow = {
  courseSlug: string;
  courseId: string | null;
  status: string;
  percentComplete: number;
  lastUpdatedAt: Date;
};

type AdminMemberProgramProgressRow = {
  programSlug: string;
  averagePercent: number;
  coursesCompleted: number;
  lastUpdatedAt: Date;
};

const CAREER_PLAN_EVENT_NAMES = [
  'career_quiz_result_viewed',
  'career_plan_saved',
  'career_plan_commitment_shared',
  'career_plan_application_started',
  'career_plan_training_cta_clicked',
] satisfies string[];

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadataAsync({
  title: 'Member Detail',
  description: 'View and manage member.',
  path: '/admin/members',
});
}

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const workspaceEmailAvailability = getWorkspaceEmailAvailability();
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/members');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const { id } = await params;

  const fullMemberSelect = {
    id: true,
    organizationId: true,
    email: true,
    fullName: true,
    phone: true,
    deletedAt: true,
    enrolledProgram: true,
    enrolledAt: true,
    programChangedAt: true,
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
    careerRecommendationJson: true,
    applications: {
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        status: true,
        submittedAt: true,
        recommendedCareerTitle: true,
        programRankedSlugs: true,
      },
    },
    memberEvents: {
      where: {
        eventName: {
          in: CAREER_PLAN_EVENT_NAMES as string[],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { eventName: true, createdAt: true, metadata: true },
    },
    wioaQualificationJson: true,
    wioaReviewStatus: true,
    wioaReviewedAt: true,
    wioaReviewedByUserId: true,
    wioaReviewNotes: true,
    courseraEnrollmentApproved: true,
    courseraEnrollmentApprovedAt: true,
    courseraEnrollmentApprovedById: true,
    profile: true,
    learningProgress: true,
    courseProgress: {
      orderBy: { lastUpdatedAt: 'desc' },
      select: { courseSlug: true, courseId: true, status: true, percentComplete: true, lastUpdatedAt: true },
    },
    memberProgramProgress: {
      select: { programSlug: true, averagePercent: true, coursesCompleted: true, lastUpdatedAt: true },
    },
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
    organizationId: true,
    email: true,
    fullName: true,
    phone: true,
    deletedAt: true,
    enrolledProgram: true,
    enrolledAt: true,
    programChangedAt: true,
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
    careerRecommendationJson: true,
    applications: {
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        status: true,
        submittedAt: true,
        recommendedCareerTitle: true,
        programRankedSlugs: true,
      },
    },
    memberEvents: {
      where: {
        eventName: {
          in: CAREER_PLAN_EVENT_NAMES as string[],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { eventName: true, createdAt: true, metadata: true },
    },
    courseraEnrollmentApproved: true,
    courseraEnrollmentApprovedAt: true,
    courseraEnrollmentApprovedById: true,
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
      take: 5000,
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.partnerReferral.findFirst({
      where: { memberId: id },
      select: { partnerId: true },
    }),
    prisma.subgroup.findMany({
      take: 5000,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, type: true },
    }),
    prisma.memberSubgroup.findMany({
      take: 5000,
      where: { memberId: id },
      select: { subgroupId: true },
    }),
    prisma.counselor.findMany({
      take: 5000,
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
    // Multi-program: funding/workspace metadata lives on the primary
    // enrollment row. Secondary enrollments inherit nothing here.
    prisma.courseEnrollment.findFirst({
      where: { userId: id, isPrimary: true },
      select: {
        fundingSource: true,
        fundingNotes: true,
        workspaceEmail: true,
        workspaceEmailProvisioned: true,
      },
    }).catch(() => null),
    prisma.memberEvent.findMany({
      where: { userId: id, eventName: 'PLACEMENT_CONFIRMATION_SUBMITTED' },
      orderBy: { createdAt: 'desc' },
      take: 1,
      select: { metadata: true, createdAt: true },
    }).catch(() => []),
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
  let pendingPlacementEvents: any;

  try {
    [member, partners, partnerReferral, subgroups, memberSubgroups, counselorRows, activeCounselorAssign, placedOutcomeRow, courseEnrollment, pendingPlacementEvents] =
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

    [member, partners, partnerReferral, subgroups, memberSubgroups, counselorRows, activeCounselorAssign, placedOutcomeRow, courseEnrollment, pendingPlacementEvents] =
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

  const organizationId = await getActorOrganizationId(user.id);
  const catalogPrograms = await prisma.organizationProgramCatalog.findMany({
    take: 5000,
    where: { organizationId },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { programSlug: true, name: true, status: true },
  });
  const programOptions =
    catalogPrograms.length > 0
      ? catalogPrograms.map((r) => ({ slug: r.programSlug, name: r.name, status: r.status }))
      : null;

  const gate = isMemberWioaVerified({
    wioaReviewStatus: member.wioaReviewStatus,
    enrolledByAdminId: courseEnrollment?.enrolledByAdminId,
  });
  const enrollmentGateBlocked = !gate.ok;

  const program = member.enrolledProgram ? getProgramBySlug(member.enrolledProgram) : null;
  const liveCourseProgress = (member.courseProgress ?? []) as AdminCourseProgressRow[];
  const liveProgressBySlug = new Map<string, AdminCourseProgressRow>(liveCourseProgress.map((row) => [row.courseSlug, row]));
  const liveProgramProgress = ((member.memberProgramProgress ?? []) as AdminMemberProgramProgressRow[])
    .find((row) => row.programSlug === member.enrolledProgram) ?? null;
  const completedCount = program
    ? (liveProgramProgress?.coursesCompleted ?? liveCourseProgress.filter((row) => row.status === 'COMPLETED').length)
    : 0;
  const careerPlanSignal = deriveCareerPlanSignal({
    careerRecommendationJson: member.careerRecommendationJson,
    applications: member.applications ?? [],
    events: member.memberEvents ?? [],
    enrolledProgram: member.enrolledProgram,
    activeCourseCount: liveCourseProgress.filter((row) => row.status === 'IN_PROGRESS').length,
    progressPercent: liveProgramProgress?.averagePercent ?? 0,
  });
  const assessmentAnswers = member.assessmentAnswers as Record<number, string> | null;

  // Progress strip props for admin view
  const adminAllCoursesComplete =
    program != null &&
    program.courses.length > 0 &&
    program.courses.every((c) => liveProgressBySlug.get(c.slug)?.status === 'COMPLETED');
  const adminProgressStripProps = {
    intake: !!preScreening || !!(member as { onboardingCompletedAt?: unknown }).onboardingCompletedAt,
    assessment: !!member.assessmentCompleted,
    trainingStarted: liveCourseProgress.length > 0,
    certsComplete: adminAllCoursesComplete,
    employed: !!placedOutcomeRow,
  };
  const chatThread = await getOrCreateMemberCounselorThread(member.id);
  const chatMsgs = await prisma.message.findMany({
    take: 5000,
    where: { threadId: chatThread.id },
    orderBy: { createdAt: 'asc' },
  });
  const chatAuthorIds = compactStringIds(chatMsgs.map((m) => m.authorId));
  const chatAuthors =
    chatAuthorIds.length > 0
      ? await prisma.user.findMany({
        take: 5000,
          where: { id: { in: chatAuthorIds } },
          select: { id: true, fullName: true },
        })
      : [];
  const chatNameById = new Map(chatAuthors.map((n) => [n.id, n.fullName]));

  const wioaSnap = parseWioaQualificationSnapshot(member.wioaQualificationJson);

  // Coursera B4B / xAPI learner detail — surfaces CSV-imported course
  // progress, specialization badges, and last activity timestamps on the
  // main member detail so admins do not have to context-switch to
  // /admin/coursera/learners/[userId] to see what's actually flowing in.
  const courseraDetail = await loadLearnerProgressByUserId(member.id);
  const courseraCourseCount = courseraDetail?.courses.length ?? 0;
  const courseraCompletedCount = courseraDetail?.courses.filter((c) => c.isCompleted).length ?? 0;
  const courseraBadgeCount = courseraDetail?.badges.length ?? 0;
  const courseraCompletedBadgeCount =
    courseraDetail?.badges.filter((b) => b.badgeCompleted).length ?? 0;
  const courseraLastActivity = courseraDetail
    ? courseraDetail.courses.reduce<Date | null>((latest, c) => {
        if (!c.lastActivityTime) return latest;
        if (!latest || c.lastActivityTime > latest) return c.lastActivityTime;
        return latest;
      }, null)
    : null;

  const completedCourseSlugs = liveCourseProgress
    .filter((row) => row.status === 'COMPLETED')
    .map((row) => row.courseSlug);
  const skillMissionSummary = await loadSkillMissionSummary({
    userId: member.id,
    programSlug: member.enrolledProgram ?? null,
    completedCourseSlugs,
  });

  // Outcomes snapshot scoped to the member's organization. Pulled from
  // `getBoardSnapshot()` — the single source of truth that also feeds
  // /admin/outcomes and the printable /admin/outcomes/board.pdf — so the
  // cohort numbers shown next to a member match what funders see on the
  // public board. Org filter narrows the snapshot to the member's tenant
  // so cross-org cohorts are not mixed.
  const memberOrgId = (member as { organizationId?: string }).organizationId;
  const outcomesSnapshot = await getBoardSnapshot('all-time', memberOrgId).catch(
    (err: unknown) => {
      console.error('[admin/member-detail] getBoardSnapshot failed', err);
      return null;
    },
  );
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const placedLast90d = outcomesSnapshot
    ? outcomesSnapshot.outcomes.placements.filter((p) => p.placedAt >= ninetyDaysAgo).length
    : 0;
  const orgPlacementRate = outcomesSnapshot?.outcomes.totals.placementRate ?? null;
  const orgEnrolled = outcomesSnapshot?.outcomes.totals.membersEnrolled ?? 0;
  const orgPlaced = outcomesSnapshot?.outcomes.totals.membersPlaced ?? 0;
  const orgAvgWeeksToPlacement = outcomesSnapshot?.outcomes.totals.averageWeeksToPlacement ?? null;
  const orgAvgDaysToPlacement =
    orgAvgWeeksToPlacement === null ? null : Math.round(orgAvgWeeksToPlacement * 7);

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
      authorName: getMessageAuthorName(chatNameById, m.authorId),
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap', maxWidth: 430 }}>
            <Link href={`/admin/members/${id}/stakeholder`} className="btn btn-outline" style={{ flex: '1 1 10rem', justifyContent: 'center', minHeight: 44, textAlign: 'center' }}>Open stakeholder view</Link>
            <Link href={`/admin/members/${id}/lifecycle`} className="btn btn-outline" style={{ flex: '1 1 8rem', justifyContent: 'center', minHeight: 44 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', marginRight: '0.25rem', verticalAlign: 'middle' }} aria-hidden="true">timeline</span>
              Lifecycle
            </Link>
            <Link href={`/admin/members/${id}/readiness`} className="btn btn-outline" style={{ flex: '1 1 8rem', justifyContent: 'center', minHeight: 44 }}>
              <ClipboardList size={18} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
              Readiness
            </Link>
            <Link href="/admin/members" className="btn btn-outline" style={{ flex: '1 1 10rem', justifyContent: 'center', minHeight: 44 }}>Back to Members</Link>
          </div>
        }
      />

      {/* ── Member journey progress strip ── */}
      <div style={{ maxWidth: '800px', marginBottom: '1.5rem' }}>
        <MemberProgressStrip {...adminProgressStripProps} />
      </div>

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
            <div style={{ marginTop: '1rem' }}>
              <AdminMemberQuickSummary memberId={id} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant, #555)', margin: '0 0 0.5rem' }}>
                Send a link to this member
              </p>
              <AdminMemberSendLinks memberId={id} />
            </div>
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
          <p>
            <strong>Employment status at enrollment:</strong>{' '}
            {member.profile?.employmentStatusAtEnroll
              ? (member.profile.employmentStatusAtEnroll as string).replace(/_/g, ' ')
              : '—'}
          </p>
          {member.profile?.hasEmploymentBarrier && member.profile.barrierTypes && (member.profile.barrierTypes as string[]).length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Employment barriers:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
                {(member.profile.barrierTypes as string[]).map((bt: string) => (
                  <span
                    key={bt}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: 'color-mix(in srgb, #f59e0b 12%, transparent)',
                      color: '#92400e',
                      border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)',
                    }}
                  >
                    {bt.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
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

        {careerPlanSignal && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Career-plan signal</h2>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '999px', background: 'rgba(37,99,235,0.1)', color: '#1d4ed8', textTransform: 'capitalize' }}>
                {careerPlanSignal.stage.replace(/_/g, ' ')}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Career type</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{careerPlanSignal.typeLabel ?? '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Target career</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{careerPlanSignal.topCareerTitle ?? '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>First program</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{careerPlanSignal.selectedProgramSlug ?? '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Shared</p>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {careerPlanSignal.shareCount > 0 ? `Yes · ${careerPlanSignal.shareCount}` : 'No'}
                  {careerPlanSignal.committedAt ? ` · ${careerPlanSignal.committedAt.toLocaleDateString()}` : ''}
                </p>
              </div>
            </div>
            <div style={{ padding: '0.75rem 0.875rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Next counselor action</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{careerPlanSignal.staffAction}</p>
            </div>
          </section>
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
          {program ? (
            <p>
              <strong>Course progress:</strong>{' '}
              {liveProgramProgress
                ? `${liveProgramProgress.averagePercent}% overall · ${completedCount} of ${program.courses.length} complete`
                : `${completedCount} of ${program.courses.length} complete`}
            </p>
          ) : (
            <p><strong>Course progress:</strong> No program enrolled</p>
          )}
          
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
            {program?.courses.map((c) => {
              const progress = liveProgressBySlug.get(c.slug);
              const completed = progress?.status === 'COMPLETED';
              return (
                <li key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  {completed ? <CheckCircle size={18} style={{ color: 'var(--color-green)', flexShrink: 0 }} /> : <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid var(--outline-variant)', borderRadius: 4, flexShrink: 0 }} />}
                  <span style={{ flex: 1 }}>
                    {c.name}
                    {progress ? (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                        {progress.percentComplete}% · {progress.status === 'COMPLETED' ? 'completed' : 'in progress'}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>

          {member.userCertifications && member.userCertifications.length > 0 && (
            <div style={{ marginTop: '1.5rem', background: '#fff3cd', border: '1px solid #ffeeba', padding: '1rem', borderRadius: '0.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', color: '#856404' }}>
                <AlertTriangle size={16} aria-hidden />
                Unverified External Certifications
              </h3>
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
            enrollmentGateBlocked={enrollmentGateBlocked}
            currentProgramSlug={member.enrolledProgram}
            assessmentCompleted={member.assessmentCompleted}
            programOptions={programOptions ?? []}
          />

          {/* Coursera enrollment approval — gates the "Enroll in this course"
              button on the member's training page. Each approval can lead to
              a paid Coursera seat being consumed. See
              docs/COURSERA-ENROLLMENT-FLOW.md. */}
          <MemberCourseraEnrollmentApproval
            memberId={member.id}
            memberName={member.fullName}
            initialApproved={Boolean(member.courseraEnrollmentApproved)}
            approvedAt={
              member.courseraEnrollmentApprovedAt
                ? member.courseraEnrollmentApprovedAt.toISOString()
                : null
            }
            approvedByName={null}
          />
        </section>

        {/* Outcomes summary — same getBoardSnapshot() truth-set that drives
            /admin/outcomes and /admin/outcomes/board.pdf. Shows the org-level
            cohort context (placement rate, time-to-placement, recent placement
            volume) so an admin reviewing one member can see how their case
            fits the board's headline numbers. Per-member outcome detail is
            shown when a placement_records row exists. */}
        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Outcomes summary</h2>
            <Link
              href="/admin/outcomes"
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
            >
              Open full outcomes board →
            </Link>
          </div>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Cohort context for this member&apos;s organization — single source of truth via{' '}
            <code>getBoardSnapshot()</code>.
          </p>
          {outcomesSnapshot ? (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: placedOutcomeRow ? '1rem' : 0,
                }}
              >
                <div style={{ padding: '0.625rem 0.75rem', borderRadius: 8, background: 'var(--color-surface-variant, #f5f5f5)' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>
                    Placed (last 90d)
                  </p>
                  <p style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>{placedLast90d}</p>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', borderRadius: 8, background: 'var(--color-surface-variant, #f5f5f5)' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>
                    Placement rate
                  </p>
                  <p style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
                    {orgEnrolled < SMALL_SAMPLE_THRESHOLD
                      ? `N=${orgEnrolled}`
                      : `${orgPlacementRate ?? 0}%`}
                  </p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', margin: '0.15rem 0 0' }}>
                    {orgPlaced} of {orgEnrolled} enrolled
                  </p>
                </div>
                <div style={{ padding: '0.625rem 0.75rem', borderRadius: 8, background: 'var(--color-surface-variant, #f5f5f5)' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>
                    Avg time to placement
                  </p>
                  <p style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
                    {orgAvgDaysToPlacement === null ? '—' : `${orgAvgDaysToPlacement} d`}
                  </p>
                </div>
              </div>
              {placedOutcomeRow ? (
                <div
                  style={{
                    padding: '0.75rem 0.875rem',
                    borderRadius: 8,
                    background: 'rgba(46, 125, 50, 0.08)',
                    border: '1px solid rgba(46, 125, 50, 0.2)',
                  }}
                >
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.35rem' }}>
                    This member&apos;s placement
                  </p>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                    {placedOutcomeRow.jobTitle} · {placedOutcomeRow.employerName}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                    Placed{' '}
                    {placedOutcomeRow.placedAt instanceof Date
                      ? placedOutcomeRow.placedAt.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : new Date(placedOutcomeRow.placedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                    {placedOutcomeRow.salaryOffered
                      ? ` · $${placedOutcomeRow.salaryOffered.toLocaleString('en-US')}/yr at placement`
                      : ''}
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              Outcomes snapshot is unavailable right now.
            </p>
          )}
        </section>

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Coursera training</h2>
            <Link
              href={`/admin/coursera/learners/${member.id}`}
              style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)', textDecoration: 'none' }}
            >
              Open full Coursera detail →
            </Link>
          </div>
          {courseraDetail && (courseraCourseCount > 0 || courseraBadgeCount > 0) ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Courses</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {courseraCompletedCount}/{courseraCourseCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>complete</span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Specializations</p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {courseraCompletedBadgeCount}/{courseraBadgeCount} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>earned</span>
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', margin: '0 0 0.2rem' }}>Last activity</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, margin: 0 }}>
                    {courseraLastActivity ? courseraLastActivity.toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>
              {courseraCourseCount > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: '0.35rem' }}>
                  {courseraDetail.courses.slice(0, 5).map((c) => (
                    <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem' }}>
                      {c.isCompleted ? (
                        <CheckCircle size={16} style={{ color: 'var(--color-green)', flexShrink: 0 }} />
                      ) : (
                        <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--outline-variant)', borderRadius: 4, flexShrink: 0 }} />
                      )}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.courseName}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                        {Number(c.overallProgress).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                  {courseraCourseCount > 5 ? (
                    <li style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', paddingLeft: '1.6rem' }}>
                      + {courseraCourseCount - 5} more — see full detail
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </>
          ) : (
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
              No Coursera activity recorded yet. Data populates from the B4B sync (every 6h),
              xAPI webhook, or manual CSV import on{' '}
              <Link href="/admin/coursera/csv-import" style={{ color: 'var(--color-accent)' }}>
                /admin/coursera/csv-import
              </Link>.
            </p>
          )}
          <MemberCourseraDiagnoseButton memberId={member.id} />
        </section>

        <AdminMemberSkillCheckpointPanel memberId={member.id} summary={skillMissionSummary} />

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
          {pendingPlacementEvents && pendingPlacementEvents.length > 0 && !placedOutcomeRow && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.875rem 1rem',
                background: 'rgba(255,193,7,0.08)',
                border: '1px solid rgba(255,193,7,0.2)',
                borderRadius: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-warning)' }}>pending</span>
                <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)' }}>Pending member-reported placement</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
                This member self-reported accepting a job offer on{' '}
                {new Date(pendingPlacementEvents[0].createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                . Review and verify to create an official placement record.
              </p>
            </div>
          )}
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
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Workspace email</h2>
          <AdminMemberWorkspaceEmail
            memberId={member.id}
            workspaceEmail={member.workspaceEmail ?? null}
            workspaceEmailProvisioned={!!member.workspaceEmailProvisioned}
            providerAvailable={workspaceEmailAvailability.available}
            providerHint={workspaceEmailAvailability.reason}
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

        <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Resumes</h2>
          <AdminMemberResumeSection memberId={member.id} />
        </section>

        {member.assessmentCompleted && (
          <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Assessment</h2>
            <p><strong>Score:</strong> {member.assessmentScore ?? 0}/100 ({member.assessmentScorePct ?? 0}%)</p>
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
