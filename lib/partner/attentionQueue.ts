import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';

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
  if (stage === 'applied') {
    if (tier === 'high' || tier === 'medium') return 'Call or text to confirm they started the apply flow and list your org as referral source.';
    return 'Send a quick check-in: offer to help finish enrollment steps.';
  }
  if (stage === 'enrolled') {
    if (tier === 'high' || tier === 'medium') return 'Nudge them to stay on pace in the first two weeks of training.';
    return 'Celebrate enrollment and set a reminder to check progress next week.';
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

export async function buildPartnerAttentionQueue(partnerId: string): Promise<PartnerAttentionRow[]> {
  const referrals = await prisma.partnerReferral.findMany({
    take: 500,
    where: { partnerId, member: { deletedAt: null } },
    include: {
      assignedPartnerUser: { select: { fullName: true } },
      member: {
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          enrolledAt: true,
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
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: '',
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: m.assessmentCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord as PipelineStudent['placementRecord'],
      userCertifications: m.userCertifications as PipelineStudent['userCertifications'],
      applications: m.applications,
      memberProgramProgress: m.memberProgramProgress,
    };
    const stage = getPipelineStage(student);
    if (stage !== 'applied' && stage !== 'enrolled') continue;

    const staleDays = staleDaysSince(m.updatedAt);
    const riskTier = computeRiskTier(staleDays);
    const program = m.enrolledProgram ? getProgramBySlug(m.enrolledProgram) : null;

    rows.push({
      memberId: m.id,
      fullName: m.fullName,
      stage,
      stageLabel: PIPELINE_STAGE_LABELS[stage as keyof typeof PIPELINE_STAGE_LABELS] ?? stage,
      programTitle: program?.title ?? '—',
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
