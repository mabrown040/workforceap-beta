/**
 * Partner Quarterly Outcomes Report
 *
 * Funder-ready metrics for grant reporting scoped to a single partner:
 * enrollments, completions, placements, salary data for members referred
 * by a specific partner.
 *
 * Deterministic: same inputs + same DB state = same output.
 */

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import {
  memberProgramCompleted,
  memberProgramProgressPct,
} from '@/lib/partner/memberProgress';
import { getPipelineStage, PIPELINE_STAGE_LABELS, type PipelineStudent } from '@/lib/pipeline/stage';
import { summarizeRetentionOutcomes, type RetentionSummary } from './retentionOutcome';

export interface QuarterSpec {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
}

export interface PartnerQuarterlyOutcomesReport {
  quarter: string;
  year: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  partnerName: string;
  partnerSlug: string;
  metrics: {
    totalReferred: number;
    totalEnrolled: number;
    completions: number;
    placements: number;
    activeMembers: number;
    dropOffs: number;
    dropOffRate: number; // %
    avgDaysToPlacement: number | null;
    salaryAvg: number | null;
    salaryMedian: number | null;
    salaryMin: number | null;
    salaryMax: number | null;
  };
  /**
   * Retention as of the end of this quarter for every member this partner
   * has ever referred (not just this quarter's referral cohort) — a
   * placement's 90/180-day window is almost never inside the same quarter
   * the referral/placement happened in. Classified with the same
   * retentionDecision/retentionStatus OR-combination as the board snapshot
   * (lib/admin/boardOutcomes.ts) via lib/analytics/retentionOutcome.ts.
   * pendingDecision is always reported rather than dropped.
   */
  retention: {
    ninetyDay: RetentionSummary;
    hundredEightyDay: RetentionSummary;
  };
  programBreakdown: Array<{
    programSlug: string;
    enrolled: number;
    completions: number;
    placements: number;
  }>;
  membersList: Array<{
    id: string;
    fullName: string;
    email: string;
    enrolledAt: string | null;
    program: string | null;
    status: string;
    progress: number | null;
    placedAt: string | null;
    employerName: string | null;
    jobTitle: string | null;
    salaryOffered: number | null;
    daysToPlacement: number | null;
  }>;
}

function quarterToDates(spec: QuarterSpec): { start: Date; end: Date } {
  const qMap: Record<string, [number, number]> = {
    Q1: [0, 2],
    Q2: [3, 5],
    Q3: [6, 8],
    Q4: [9, 11],
  };
  const [startMonth, endMonth] = qMap[spec.quarter];
  const start = new Date(spec.year, startMonth, 1, 0, 0, 0, 0);
  const end = new Date(spec.year, endMonth + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getDefaultQuarter(): QuarterSpec {
  const now = new Date();
  const currentQ = Math.floor(now.getMonth() / 3) + 1;
  const currentY = now.getFullYear();

  // Default to previous completed quarter
  if (currentQ === 1) {
    return { quarter: 'Q4', year: currentY - 1 };
  }
  return {
    quarter: `Q${currentQ - 1}` as QuarterSpec['quarter'],
    year: currentY,
  };
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every placement belonging to a member this partner has ever referred
 * (all-time, not scoped to the current quarter's referral window) whose
 * N-day retention window has elapsed by `windowEnd`.
 */
async function fetchPartnerRetentionRowsAsOf(
  orgId: string,
  partnerId: string,
  windowEnd: Date,
  windowDays: number
) {
  const referrals = await prisma.partnerReferral.findMany({
    take: 5000,
    where: { partnerId, member: { organizationId: orgId, deletedAt: null } },
    select: { memberId: true },
  });
  const memberIds = referrals.map((r) => r.memberId);
  if (memberIds.length === 0) return [];

  const cutoff = new Date(windowEnd.getTime() - windowDays * DAY_MS);
  return prisma.placementRecord.findMany({
    take: 5000,
    where: {
      userId: { in: memberIds },
      placedAt: { lte: cutoff },
    },
    select: { retentionStatus: true, retentionDecision: true },
  });
}

export async function generatePartnerQuarterlyOutcomes(
  orgId: string,
  partnerId: string,
  spec: QuarterSpec
): Promise<PartnerQuarterlyOutcomesReport> {
  const { start, end } = quarterToDates(spec);

  // Fetch partner details
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: { name: true, slug: true },
  });

  if (!partner) {
    throw new Error(`Partner not found: ${partnerId}`);
  }

  const [referrals, ninetyDayRetentionRows, hundredEightyDayRetentionRows] = await Promise.all([
    // Fetch all referrals for this partner in the date range
    prisma.partnerReferral.findMany({
      take: 5000,
      where: {
        partnerId,
        referredAt: { gte: start, lte: end },
        member: { deletedAt: null, organizationId: orgId },
      },
      include: {
        member: {
          select: {
            id: true,
            fullName: true,
            email: true,
            enrolledAt: true,
            enrolledProgram: true,
            deletedAt: true,
            assessmentCompleted: true,
            placementRecord: {
              select: {
                jobTitle: true,
                employerName: true,
                salaryOffered: true,
                placedAt: true,
              },
            },
            userCertifications: { select: { certName: true, earnedAt: true } },
            applications: { select: { status: true, submittedAt: true } },
            memberProgramProgress: {
              select: { programSlug: true, averagePercent: true, coursesCompleted: true },
            },
            courseEnrollments: {
              select: { programSlug: true, enrolledAt: true },
            },
            courseProgress: {
              select: { percentComplete: true, completedAt: true },
            },
          },
        },
      },
      orderBy: { referredAt: 'desc' },
    }),
    fetchPartnerRetentionRowsAsOf(orgId, partnerId, end, 90),
    fetchPartnerRetentionRowsAsOf(orgId, partnerId, end, 180),
  ]);

  const members = referrals.map((r) => r.member);
  const totalReferred = members.length;

  // Count enrolled (have an enrolledProgram)
  const enrolledMembers = members.filter((m) => m.enrolledProgram != null);
  const totalEnrolled = enrolledMembers.length;

  // Determine completions
  let completions = 0;
  for (const m of members) {
    if (memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress)) {
      completions++;
    }
  }

  // Determine placements
  const placements = members.filter((m) => m.placementRecord != null);
  const placementsCount = placements.length;

  // Active = enrolled, not placed, not completed, has started training
  const activeMembers = members.filter(
    (m) =>
      m.placementRecord == null &&
      !memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress) &&
      m.courseProgress.some((cp) => cp.percentComplete > 0)
  );

  // Drop-off = enrolled, not placed, not completed, and never started training
  const dropOffMembers = members.filter(
    (m) =>
      m.placementRecord == null &&
      !memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress) &&
      !m.courseProgress.some((cp) => cp.percentComplete > 0)
  );

  // Salary stats
  const salaries = placements
    .map((m) => m.placementRecord?.salaryOffered)
    .filter((s): s is number => typeof s === 'number' && s > 0);

  // Time to placement
  const daysToPlacement = placements
    .map((m) => {
      if (!m.enrolledAt || !m.placementRecord?.placedAt) return null;
      const ms = m.placementRecord.placedAt.getTime() - m.enrolledAt.getTime();
      return ms > 0 ? Math.round(ms / (24 * 60 * 60 * 1000)) : null;
    })
    .filter((d): d is number => d !== null);

  // Program breakdown
  const programMap = new Map<
    string,
    { programSlug: string; enrolled: number; completions: number; placements: number }
  >();

  for (const m of members) {
    const slugs =
      m.courseEnrollments.length > 0
        ? Array.from(new Set(m.courseEnrollments.map((e) => e.programSlug)))
        : m.enrolledProgram
          ? [m.enrolledProgram]
          : [];
    for (const slug of slugs) {
      const cur = programMap.get(slug) ?? {
        programSlug: slug,
        enrolled: 0,
        completions: 0,
        placements: 0,
      };
      cur.enrolled += 1;
      programMap.set(slug, cur);
    }
  }

  for (const m of members) {
    if (memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress)) {
      const slugs =
        m.courseEnrollments.length > 0
          ? Array.from(new Set(m.courseEnrollments.map((e) => e.programSlug)))
          : m.enrolledProgram
            ? [m.enrolledProgram]
            : [];
      for (const slug of slugs) {
        const cur = programMap.get(slug) ?? {
          programSlug: slug,
          enrolled: 0,
          completions: 0,
          placements: 0,
        };
        cur.completions += 1;
        programMap.set(slug, cur);
      }
    }
  }

  for (const m of placements) {
    const slugs =
      m.courseEnrollments.length > 0
        ? Array.from(new Set(m.courseEnrollments.map((e) => e.programSlug)))
        : m.enrolledProgram
          ? [m.enrolledProgram]
          : [];
    for (const slug of slugs) {
      const cur = programMap.get(slug) ?? {
        programSlug: slug,
        enrolled: 0,
        completions: 0,
        placements: 0,
      };
      cur.placements += 1;
      programMap.set(slug, cur);
    }
  }

  const programBreakdown = [...programMap.values()].sort((a, b) => b.enrolled - a.enrolled);

  // Members list with status
  const membersList = members.map((m) => {
    const student: PipelineStudent = {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      enrolledProgram: m.enrolledProgram,
      enrolledAt: m.enrolledAt,
      assessmentCompleted: m.assessmentCompleted,
      deletedAt: m.deletedAt,
      placementRecord: m.placementRecord,
      userCertifications: m.userCertifications,
      applications: m.applications,
      memberProgramProgress: m.memberProgramProgress,
    };
    const stage = getPipelineStage(student);
    const stageLabel = PIPELINE_STAGE_LABELS[stage];

    const progress = memberProgramProgressPct(
      m.enrolledProgram,
      null,
      m.memberProgramProgress
    );

    const daysToPlace =
      m.enrolledAt && m.placementRecord?.placedAt
        ? Math.round(
            (m.placementRecord.placedAt.getTime() - m.enrolledAt.getTime()) /
              (24 * 60 * 60 * 1000)
          )
        : null;

    return {
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      enrolledAt: m.enrolledAt ? formatDate(m.enrolledAt) : null,
      program: m.enrolledProgram ? getProgramBySlug(m.enrolledProgram)?.title ?? m.enrolledProgram : null,
      status: stageLabel,
      progress,
      placedAt: m.placementRecord?.placedAt ? formatDate(m.placementRecord.placedAt) : null,
      employerName: m.placementRecord?.employerName ?? null,
      jobTitle: m.placementRecord?.jobTitle ?? null,
      salaryOffered: m.placementRecord?.salaryOffered ?? null,
      daysToPlacement: daysToPlace,
    };
  });

  return {
    quarter: spec.quarter,
    year: spec.year,
    periodStart: formatDate(start),
    periodEnd: formatDate(end),
    generatedAt: new Date().toISOString(),
    partnerName: partner.name,
    partnerSlug: partner.slug,
    metrics: {
      totalReferred,
      totalEnrolled,
      completions,
      placements: placementsCount,
      activeMembers: activeMembers.length,
      dropOffs: dropOffMembers.length,
      dropOffRate: totalReferred > 0 ? Math.round((dropOffMembers.length / totalReferred) * 100) : 0,
      avgDaysToPlacement: avg(daysToPlacement),
      salaryAvg: avg(salaries),
      salaryMedian: median(salaries),
      salaryMin: salaries.length > 0 ? Math.min(...salaries) : null,
      salaryMax: salaries.length > 0 ? Math.max(...salaries) : null,
    },
    retention: {
      ninetyDay: summarizeRetentionOutcomes(ninetyDayRetentionRows),
      hundredEightyDay: summarizeRetentionOutcomes(hundredEightyDayRetentionRows),
    },
    programBreakdown,
    membersList,
  };
}
