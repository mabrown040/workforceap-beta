import { prisma } from '@/lib/db/prisma';
import { programDisplayTitle } from '@/lib/content/programTitle';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import { resolveTrainingProgressAssignment } from '@/lib/member/trainingProgress';
import { MEMBER_ONLY_WHERE } from '@/lib/admin/memberOnlyWhere';

export type RiskTier = 'high' | 'medium' | 'low' | 'watch';

export function staleDaysSince(updatedAt: Date): number {
  return Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeRiskTier(daysStale: number): RiskTier {
  if (daysStale >= 14) return 'high';
  if (daysStale >= 7) return 'medium';
  if (daysStale >= 3) return 'low';
  return 'watch';
}

export function nextBestAction(stage: string, tier: RiskTier): string {
  if (stage === 'approval_pending') {
    return 'Ask WorkforceAP to confirm enrollment approval and any funding steps before asking the member to start training.';
  }
  if (stage === 'applied') {
    if (tier === 'high' || tier === 'medium') return 'Check whether they need help completing their application or assessment.';
    return 'Send a quick check-in: offer to help finish enrollment steps.';
  }
  if (stage === 'enrolled') {
    return 'Confirm they can open their assigned courses and help them choose a first training session.';
  }
  if (stage === 'in_training') {
    return 'Check their latest course progress and ask what is blocking the next step; involve WorkforceAP if support is needed.';
  }
  return 'Review pipeline stage and schedule a touchpoint.';
}

export type PartnerAttentionRow = {
  memberId: string;
  fullName: string;
  stage: string;
  stageLabel: string;
  programTitle: string;
  staleDays: number;
  riskTier: RiskTier;
  nextBestAction: string;
  assignedPartnerUserId: string | null;
  assignedToName: string | null;
  lastTouchName: string | null;
};

export async function buildPartnerAttentionQueue(partnerId: string, organizationId: string): Promise<PartnerAttentionRow[]> {
  const referrals = await prisma.partnerReferral.findMany({
    take: 500,
    where: {
      partnerId,
      partner: { organizationId, active: true },
      member: { organizationId, deletedAt: null, ...MEMBER_ONLY_WHERE },
    },
    include: {
      assignedPartnerUser: { select: { fullName: true } },
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          courseEnrollments: {
            orderBy: [{ isPrimary: 'desc' }, { enrolledAt: 'desc' }],
            select: { programSlug: true, curriculumVersion: true, isPrimary: true },
          },
          enrolledAt: true,
          courseraEnrollmentApproved: true,
          updatedAt: true,
          deletedAt: true,
          assessmentCompleted: true,
          placementRecord: {
            select: { employerName: true, jobTitle: true, salaryOffered: true, placedAt: true },
          },
          userCertifications: { select: { certName: true, earnedAt: true } },
          applications: { select: { status: true, submittedAt: true } },
          memberProgramProgress: {
            select: { programSlug: true, averagePercent: true, coursesCompleted: true },
          },
        },
      },
    },
    orderBy: { referredAt: 'desc' },
  });

  const memberIds = referrals.map((r) => r.member.id);
  const recentLogs =
    memberIds.length === 0
      ? []
      : await prisma.partnerOutreachLog.findMany({
          where: { partnerId, memberId: { in: memberIds } },
          orderBy: { createdAt: 'desc' },
          // No global cap: the dedup loop below keeps only the FIRST log
          // per memberId (most-recent due to orderBy). A global take: 400
          // would starve later memberIds — high-activity members consumed
          // the entire window and the rest showed "Unknown" as last touch.
          // Bound generously per-member.
          take: Math.max(memberIds.length * 5, 400),
          include: { createdBy: { select: { fullName: true } } },
        });
  const lastTouchByMember = new Map<string, string>();
  for (const l of recentLogs) {
    if (!lastTouchByMember.has(l.memberId)) lastTouchByMember.set(l.memberId, l.createdBy?.fullName ?? 'User');
  }

  const rows: PartnerAttentionRow[] = [];

  for (const r of referrals) {
    const m = r.member;
    const assignment = resolveTrainingProgressAssignment(
      m.enrolledProgram,
      m.courseEnrollments,
    );
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: assignment.programSlug,
      curriculumVersion: assignment.curriculumVersion,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: m.assessmentCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord as PipelineStudent['placementRecord'],
      userCertifications: m.userCertifications as PipelineStudent['userCertifications'],
      applications: m.applications,
      memberProgramProgress: m.memberProgramProgress,
    };
    const pipelineStage = getPipelineStage(student);
    if (pipelineStage !== 'applied' && pipelineStage !== 'enrolled' && pipelineStage !== 'in_training') continue;
    // A saved program/enrollment row is not approval or proof of funded access.
    // Keep observed training activity visible even if a legacy approval flag
    // is absent; only pre-training enrollments use the pending label.
    const stage = pipelineStage === 'enrolled' && !m.courseraEnrollmentApproved
      ? 'approval_pending'
      : pipelineStage;

    const staleDays = staleDaysSince(m.updatedAt);
    const riskTier = computeRiskTier(staleDays);

    rows.push({
      memberId: m.id,
      fullName: m.fullName,
      stage,
      stageLabel: stage === 'approval_pending'
        ? 'Training approval pending'
        : PIPELINE_STAGE_LABELS[stage as keyof typeof PIPELINE_STAGE_LABELS] ?? stage,
      programTitle: assignment.programSlug ? programDisplayTitle(assignment.programSlug) : '—',
      staleDays,
      riskTier,
      nextBestAction: nextBestAction(stage, riskTier),
      assignedPartnerUserId: r.assignedPartnerUserId,
      assignedToName: r.assignedPartnerUser?.fullName ?? null,
      lastTouchName: lastTouchByMember.get(m.id) ?? null,
    });
  }

  const tierOrder: Record<RiskTier, number> = { high: 0, medium: 1, low: 2, watch: 3 };
  rows.sort((a, b) => tierOrder[a.riskTier] - tierOrder[b.riskTier] || b.staleDays - a.staleDays);

  return rows;
}

export function countActionablePartnerAttention(rows: PartnerAttentionRow[]): number {
  return rows.filter((r) => r.riskTier !== 'watch').length;
}
