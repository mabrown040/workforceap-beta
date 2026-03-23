import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { memberProgramProgressPct } from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

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
    select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
  },
  userCertifications: { select: { certName: true, earnedAt: true } },
  applications: { select: { status: true, submittedAt: true } },
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
  } | null;
  userCertifications: { certName: string; earnedAt: Date | null }[];
  applications: { status: string; submittedAt: Date | null }[];
};

export type PipelineRow = {
  member: ReferralMember;
  stage: string;
  progress: number;
  programTitle: string;
};

export async function loadPartnerReferralBundle(partnerId: string) {
  const referrals = await prisma.partnerReferral.findMany({
    where: { partnerId, member: { deletedAt: null } },
    include: {
      member: { select: referralMemberSelect },
    },
    orderBy: { referredAt: 'desc' },
  });

  const members = referrals.map((r) => r.member as ReferralMember);
  const pipelineMembers: PipelineRow[] = [];

  for (const m of members) {
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
      stage,
      progress: memberProgramProgressPct(m.enrolledProgram, m.coursesCompleted),
      programTitle: program?.title ?? '—',
    });
  }

  return { referrals, members, pipelineMembers };
}

export function toPartnerMembersListRows(pipelineMembers: PipelineRow[]) {
  return pipelineMembers.map(({ member: m, stage, progress, programTitle }) => {
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
      updatedAtLabel: m.updatedAt.toLocaleDateString(),
    };
  });
}
