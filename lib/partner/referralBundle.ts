import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';

const referralMemberSelect = {
  id: true,
  fullName: true,
  enrolledProgram: true,
  enrolledAt: true,
  coursesCompleted: true,
  updatedAt: true,
  deletedAt: true,
  assessmentCompleted: true,
  placementRecord: {
    select: {
      employerName: true,
      jobTitle: true,
      salaryOffered: true,
      placedAt: true,
      onboardingWindowEnd: true,
      retentionDecision: true,
    },
  },
  profile: {
    select: {
      city: true,
      state: true,
      zip: true,
      ethnicity: true,
      veteranStatus: true,
      employmentStatus: true,
      educationLevel: true,
    },
  },
  userCertifications: { select: { certName: true, earnedAt: true } },
  applications: { select: { status: true, submittedAt: true } },
  memberProgramProgress: {
    select: { programSlug: true, averagePercent: true, coursesCompleted: true },
  },
} as const;

export type ReferralMember = {
  id: string;
  fullName: string;
  enrolledProgram: string | null;
  enrolledAt: Date | null;
  coursesCompleted: unknown;
  updatedAt: Date;
  deletedAt: Date | null;
  assessmentCompleted: boolean;
  placementRecord: {
    employerName: string;
    jobTitle: string;
    salaryOffered: number | null;
    placedAt: Date | null;
    onboardingWindowEnd: Date | null;
    retentionDecision: string | null;
  } | null;
  profile: {
    city: string | null;
    state: string | null;
    zip: string | null;
    ethnicity: string | null;
    veteranStatus: string | null;
    employmentStatus: string | null;
    educationLevel: string | null;
  } | null;
  userCertifications: { certName: string; earnedAt: Date | null }[];
  applications: { status: string; submittedAt: Date | null }[];
  memberProgramProgress: { programSlug: string; averagePercent: number; coursesCompleted: number }[];
};

export type PipelineRow = {
  member: ReferralMember;
  referredAt: Date;
  stage: string;
  progress: number;
  programTitle: string;
};

export async function loadPartnerReferralBundle(partnerId: string) {
  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId, member: { deletedAt: null, ...MEMBER_ONLY_WHERE } },
    include: {
      member: { select: referralMemberSelect },
    },
    orderBy: { referredAt: 'desc' },
  });

  const memberIds = referrals.map((r) => r.member.id);

  // Load pending placement confirmations (self-reported by members, not yet reviewed)
  const pendingPlacements =
    memberIds.length === 0
      ? []
      : await prisma.memberEvent.findMany({
          where: {
            userId: { in: memberIds },
            eventName: 'PLACEMENT_CONFIRMATION_SUBMITTED',
          },
          orderBy: { createdAt: 'desc' },
          select: {
            userId: true,
            eventName: true,
            metadata: true,
            createdAt: true,
          },
        });

  // Group by userId for quick lookup
  const pendingByUserId = new Map<string, typeof pendingPlacements[number]>();
  for (const p of pendingPlacements) {
    if (!pendingByUserId.has(p.userId)) {
      pendingByUserId.set(p.userId, p);
    }
  }

  const pipelineMembers: PipelineRow[] = [];

  for (const r of referrals) {
    const m = r.member as ReferralMember;
    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: m.assessmentCompleted,
      coursesCompleted: m.coursesCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord as PipelineStudent['placementRecord'],
      userCertifications: m.userCertifications as PipelineStudent['userCertifications'],
      applications: m.applications,
    };
    const stage = getPipelineStage(student);
    pipelineMembers.push({
      member: m,
      referredAt: r.referredAt,
      stage,
      progress: memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted, m.memberProgramProgress),
      programTitle: program?.title ?? '—',
    });
  }

  const members = pipelineMembers.map((p) => p.member);

  return { referrals, members, pipelineMembers, pendingPlacements };
}

export function toPartnerMembersListRows(pipelineMembers: PipelineRow[]) {
  return pipelineMembers.map(({ member: m, referredAt, stage, progress, programTitle }) => {
    const stageLabel = PIPELINE_STAGE_LABELS[stage as keyof typeof PIPELINE_STAGE_LABELS] ?? stage;
    const story = m.placementRecord
      ? `Placed at ${m.placementRecord.employerName} as ${m.placementRecord.jobTitle}`
      : progress >= 100
        ? `Completed ${programTitle}`
        : progress > 0
          ? `${progress}% through ${programTitle}`
          : stage === 'enrolled'
            ? `Enrolled in ${programTitle}`
            : stageLabel;

    return {
      id: m.id,
      fullName: m.fullName,
      stage,
      stageLabel,
      progress,
      programTitle,
      story,
      referredAtLabel: referredAt.toLocaleDateString(),
    };
  });
}
