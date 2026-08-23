import { prisma } from '@/lib/db/prisma';
import { ANALYTICS_COHORT_DETAIL_CAP } from '@/lib/db/scanCaps';

/**
 * AI Tool Efficacy Analysis
 *
 * Measures whether members who use AI tools (resume builder, interview prep,
 * job matcher, etc.) have better placement outcomes than those who don't.
 *
 * Deterministic: same data + same date range = same output.
 */

export interface AIEfficacyDateRange {
  start: Date;
  end: Date;
}

export interface ToolCohortMetrics {
  toolType: string;
  toolLabel: string;
  usersWithTool: number;
  usersWithoutTool: number;
  placedWithTool: number;
  placedWithoutTool: number;
  placementRateWith: number; // 0-100
  placementRateWithout: number; // 0-100
  avgDaysToPlacementWith: number | null;
  avgDaysToPlacementWithout: number | null;
  avgSalaryWith: number | null;
  avgSalaryWithout: number | null;
  avgJobApplicationsWith: number;
  avgJobApplicationsWithout: number;
}

export interface OverallCohortMetrics {
  anyTool: {
    usersWithTool: number;
    usersWithoutTool: number;
    placedWithTool: number;
    placedWithoutTool: number;
    placementRateWith: number;
    placementRateWithout: number;
    avgDaysToPlacementWith: number | null;
    avgDaysToPlacementWithout: number | null;
    avgSalaryWith: number | null;
    avgSalaryWithout: number | null;
    avgJobApplicationsWith: number;
    avgJobApplicationsWithout: number;
  };
}

export interface AIEfficacyReport {
  dateRange: { start: string; end: string };
  generatedAt: string;
  overall: OverallCohortMetrics;
  byTool: ToolCohortMetrics[];
  topTools: { toolType: string; toolLabel: string; placementLift: number }[];
  summaryText: string;
}

const TOOL_LABELS: Record<string, string> = {
  resume_rewriter: 'Resume Rewriter',
  cover_letter: 'Cover Letter',
  interview_practice: 'Interview Practice',
  interview_coach: 'Interview Coach',
  voice_interview_video: 'Voice Interview',
  linkedin_headline: 'LinkedIn Headline',
  linkedin_about: 'LinkedIn About',
  job_match_scorer: 'Job Match Scorer',
  resume_analysis: 'Resume Analysis',
  salary_negotiation: 'Salary Negotiation',
  gap_analyzer: 'Gap Analyzer',
  career_counselor: 'Career Counselor',
  skill_assessment: 'Skill Assessment',
};

function formatDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round1(n: number | null): number | null {
  if (n === null) return null;
  return Math.round(n * 10) / 10;
}

function round0(n: number | null): number | null {
  if (n === null) return null;
  return Math.round(n);
}

function pct(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100);
}

interface EnrolledMemberRow {
  id: string;
  enrolledAt: Date | null;
  placementRecord: { placedAt: Date; salaryOffered: number | null } | null;
  _count: { jobApplications: number };
}

async function fetchEnrolledMembers(
  orgId: string,
  dateRange: AIEfficacyDateRange
): Promise<EnrolledMemberRow[]> {
  return prisma.user.findMany({
    take: ANALYTICS_COHORT_DETAIL_CAP,
    orderBy: { enrolledAt: 'asc' },
    where: {
      deletedAt: null,
      organizationId: orgId,
      enrolledProgram: { not: null },
      enrolledAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      id: true,
      enrolledAt: true,
      placementRecord: {
        select: {
          placedAt: true,
          salaryOffered: true,
        },
      },
      _count: {
        select: {
          jobApplications: true,
        },
      },
    },
  });
}

async function fetchToolUsageMap(
  orgId: string,
  userIds: string[],
  dateRange: AIEfficacyDateRange
): Promise<Map<string, Set<string>>> {
  const usage = await prisma.aIToolResult.findMany({
    take: ANALYTICS_COHORT_DETAIL_CAP,
    where: {
      userId: { in: userIds },
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    },
    select: {
      userId: true,
      toolType: true,
    },
    distinct: ['userId', 'toolType'],
  });

  const map = new Map<string, Set<string>>();
  for (const row of usage) {
    const toolType = row.toolType as string;
    const set = map.get(toolType) ?? new Set<string>();
    set.add(row.userId);
    map.set(toolType, set);
  }
  return map;
}

function buildCohortMetrics(
  toolType: string,
  toolUserIds: Set<string>,
  allMembers: EnrolledMemberRow[]
): ToolCohortMetrics {
  const withTool = allMembers.filter((m) => toolUserIds.has(m.id));
  const withoutTool = allMembers.filter((m) => !toolUserIds.has(m.id));

  const placedWith = withTool.filter((m) => m.placementRecord !== null);
  const placedWithout = withoutTool.filter((m) => m.placementRecord !== null);

  const daysToPlacement = (rows: EnrolledMemberRow[]) =>
    rows
      .filter((m) => m.placementRecord && m.enrolledAt)
      .map((m) => {
        const enrolled = m.enrolledAt!.getTime();
        const placed = m.placementRecord!.placedAt.getTime();
        return Math.max(0, Math.round((placed - enrolled) / (1000 * 60 * 60 * 24)));
      });

  const salaries = (rows: EnrolledMemberRow[]) =>
    rows
      .filter((m) => m.placementRecord?.salaryOffered != null)
      .map((m) => m.placementRecord!.salaryOffered!);

  const jobApps = (rows: EnrolledMemberRow[]) =>
    rows.map((m) => m._count.jobApplications);

  return {
    toolType,
    toolLabel: TOOL_LABELS[toolType] ?? toolType,
    usersWithTool: withTool.length,
    usersWithoutTool: withoutTool.length,
    placedWithTool: placedWith.length,
    placedWithoutTool: placedWithout.length,
    placementRateWith: pct(placedWith.length, withTool.length),
    placementRateWithout: pct(placedWithout.length, withoutTool.length),
    avgDaysToPlacementWith: round0(avg(daysToPlacement(withTool))),
    avgDaysToPlacementWithout: round0(avg(daysToPlacement(withoutTool))),
    avgSalaryWith: round0(avg(salaries(withTool))),
    avgSalaryWithout: round0(avg(salaries(withoutTool))),
    avgJobApplicationsWith: round1(avg(jobApps(withTool))) ?? 0,
    avgJobApplicationsWithout: round1(avg(jobApps(withoutTool))) ?? 0,
  };
}

function buildOverallMetrics(
  anyToolUserIds: Set<string>,
  allMembers: EnrolledMemberRow[]
): OverallCohortMetrics {
  const withTool = allMembers.filter((m) => anyToolUserIds.has(m.id));
  const withoutTool = allMembers.filter((m) => !anyToolUserIds.has(m.id));

  const placedWith = withTool.filter((m) => m.placementRecord !== null);
  const placedWithout = withoutTool.filter((m) => m.placementRecord !== null);

  const daysToPlacement = (rows: EnrolledMemberRow[]) =>
    rows
      .filter((m) => m.placementRecord && m.enrolledAt)
      .map((m) => {
        const enrolled = m.enrolledAt!.getTime();
        const placed = m.placementRecord!.placedAt.getTime();
        return Math.max(0, Math.round((placed - enrolled) / (1000 * 60 * 60 * 24)));
      });

  const salaries = (rows: EnrolledMemberRow[]) =>
    rows
      .filter((m) => m.placementRecord?.salaryOffered != null)
      .map((m) => m.placementRecord!.salaryOffered!);

  const jobApps = (rows: EnrolledMemberRow[]) =>
    rows.map((m) => m._count.jobApplications);

  return {
    anyTool: {
      usersWithTool: withTool.length,
      usersWithoutTool: withoutTool.length,
      placedWithTool: placedWith.length,
      placedWithoutTool: placedWithout.length,
      placementRateWith: pct(placedWith.length, withTool.length),
      placementRateWithout: pct(placedWithout.length, withoutTool.length),
      avgDaysToPlacementWith: round0(avg(daysToPlacement(withTool))),
      avgDaysToPlacementWithout: round0(avg(daysToPlacement(withoutTool))),
      avgSalaryWith: round0(avg(salaries(withTool))),
      avgSalaryWithout: round0(avg(salaries(withoutTool))),
      avgJobApplicationsWith: round1(avg(jobApps(withTool))) ?? 0,
      avgJobApplicationsWithout: round1(avg(jobApps(withoutTool))) ?? 0,
    },
  };
}

export async function analyzeAIEfficacy(
  orgId: string,
  dateRange: AIEfficacyDateRange
): Promise<AIEfficacyReport> {
  const members = await fetchEnrolledMembers(orgId, dateRange);

  if (members.length === 0) {
    return {
      dateRange: { start: formatDate(dateRange.start), end: formatDate(dateRange.end) },
      generatedAt: new Date().toISOString(),
      overall: {
        anyTool: {
          usersWithTool: 0,
          usersWithoutTool: 0,
          placedWithTool: 0,
          placedWithoutTool: 0,
          placementRateWith: 0,
          placementRateWithout: 0,
          avgDaysToPlacementWith: null,
          avgDaysToPlacementWithout: null,
          avgSalaryWith: null,
          avgSalaryWithout: null,
          avgJobApplicationsWith: 0,
          avgJobApplicationsWithout: 0,
        },
      },
      byTool: [],
      topTools: [],
      summaryText: 'No enrolled members found in the selected date range.',
    };
  }

  const userIds = members.map((m) => m.id);
  const toolUsageMap = await fetchToolUsageMap(orgId, userIds, dateRange);

  // Collect all users who used *any* tool
  const anyToolUserIds = new Set<string>();
  for (const set of toolUsageMap.values()) {
    for (const uid of set) anyToolUserIds.add(uid);
  }

  const overall = buildOverallMetrics(anyToolUserIds, members);

  const byTool: ToolCohortMetrics[] = [];
  for (const [toolType, toolUserIds] of toolUsageMap) {
    byTool.push(buildCohortMetrics(toolType, toolUserIds, members));
  }

  // Sort by placement lift (descending)
  byTool.sort((a, b) => (b.placementRateWith - b.placementRateWithout) - (a.placementRateWith - a.placementRateWithout));

  const topTools = byTool
    .filter((t) => t.usersWithTool >= 3) // Require minimum sample size
    .map((t) => ({
      toolType: t.toolType,
      toolLabel: t.toolLabel,
      placementLift: t.placementRateWith - t.placementRateWithout,
    }))
    .slice(0, 5);

  const summaryLines: string[] = [
    `Analyzed ${members.length} enrolled members from ${formatDate(dateRange.start)} to ${formatDate(dateRange.end)}.`,
  ];

  const any = overall.anyTool;
  if (any.usersWithTool > 0) {
    summaryLines.push(
      `${any.usersWithTool} members used AI tools; ${any.placementRateWith}% were placed.`,
      `${any.usersWithoutTool} members did not use AI tools; ${any.placementRateWithout}% were placed.`
    );
    if (any.avgDaysToPlacementWith != null && any.avgDaysToPlacementWithout != null) {
      const faster = any.avgDaysToPlacementWithout - any.avgDaysToPlacementWith;
      summaryLines.push(
        faster > 0
          ? `Tool users placed ${faster} days faster on average.`
          : faster < 0
            ? `Tool users placed ${Math.abs(faster)} days slower on average.`
            : `Time-to-placement was equal between cohorts.`
      );
    }
    if (any.avgSalaryWith != null && any.avgSalaryWithout != null) {
      const delta = any.avgSalaryWith - any.avgSalaryWithout;
      summaryLines.push(
        delta > 0
          ? `Tool users earned $${delta.toLocaleString()} more on average.`
          : delta < 0
            ? `Tool users earned $${Math.abs(delta).toLocaleString()} less on average.`
            : `Average salary was equal between cohorts.`
      );
    }
  } else {
    summaryLines.push('No AI tool usage recorded in the selected date range.');
  }

  if (topTools.length > 0) {
    summaryLines.push(`Top tool by placement lift: ${topTools[0].toolLabel} (+${topTools[0].placementLift}pp).`);
  }

  return {
    dateRange: { start: formatDate(dateRange.start), end: formatDate(dateRange.end) },
    generatedAt: new Date().toISOString(),
    overall,
    byTool,
    topTools,
    summaryText: summaryLines.join(' '),
  };
}

export function formatEfficacyReportMarkdown(report: AIEfficacyReport): string {
  const lines: string[] = [
    '# AI Tool Efficacy Report',
    '',
    `**Date range:** ${report.dateRange.start} → ${report.dateRange.end}`,
    `**Generated:** ${report.generatedAt}`,
    '',
    '## Executive Summary',
    '',
    report.summaryText,
    '',
    '## Overall Cohort Comparison',
    '',
    '| Metric | AI Tool Users | Non-Users |',
    '|--------|--------------|-----------|',
    `| Members | ${report.overall.anyTool.usersWithTool} | ${report.overall.anyTool.usersWithoutTool} |`,
    `| Placed | ${report.overall.anyTool.placedWithTool} | ${report.overall.anyTool.placedWithoutTool} |`,
    `| Placement Rate | ${report.overall.anyTool.placementRateWith}% | ${report.overall.anyTool.placementRateWithout}% |`,
    `| Avg Days to Placement | ${report.overall.anyTool.avgDaysToPlacementWith ?? 'N/A'} | ${report.overall.anyTool.avgDaysToPlacementWithout ?? 'N/A'} |`,
    `| Avg Salary | ${report.overall.anyTool.avgSalaryWith != null ? '$' + report.overall.anyTool.avgSalaryWith.toLocaleString() : 'N/A'} | ${report.overall.anyTool.avgSalaryWithout != null ? '$' + report.overall.anyTool.avgSalaryWithout.toLocaleString() : 'N/A'} |`,
    `| Avg Job Applications | ${report.overall.anyTool.avgJobApplicationsWith} | ${report.overall.anyTool.avgJobApplicationsWithout} |`,
    '',
    '## Results by Tool',
    '',
  ];

  for (const t of report.byTool) {
    lines.push(`### ${t.toolLabel}`);
    lines.push('');
    lines.push(`- **Users:** ${t.usersWithTool} (with) vs ${t.usersWithoutTool} (without)`);
    lines.push(`- **Placement rate:** ${t.placementRateWith}% vs ${t.placementRateWithout}%`);
    if (t.avgDaysToPlacementWith != null && t.avgDaysToPlacementWithout != null) {
      lines.push(`- **Avg days to placement:** ${t.avgDaysToPlacementWith} vs ${t.avgDaysToPlacementWithout}`);
    }
    if (t.avgSalaryWith != null && t.avgSalaryWithout != null) {
      lines.push(`- **Avg salary:** $${t.avgSalaryWith.toLocaleString()} vs $${t.avgSalaryWithout.toLocaleString()}`);
    }
    lines.push(`- **Avg job applications:** ${t.avgJobApplicationsWith} vs ${t.avgJobApplicationsWithout}`);
    lines.push('');
  }

  if (report.topTools.length > 0) {
    lines.push('## Top Performing Tools');
    lines.push('');
    for (const t of report.topTools) {
      lines.push(`1. **${t.toolLabel}** — +${t.placementLift}pp placement rate`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Build a flat CSV-compatible array of objects for export. */
export function efficacyReportToCsvRows(report: AIEfficacyReport): Record<string, string | number>[] {
  const rows: Record<string, string | number>[] = [];

  // Overall row
  rows.push({
    tool: 'Any AI Tool',
    users_with: report.overall.anyTool.usersWithTool,
    users_without: report.overall.anyTool.usersWithoutTool,
    placed_with: report.overall.anyTool.placedWithTool,
    placed_without: report.overall.anyTool.placedWithoutTool,
    placement_rate_with: `${report.overall.anyTool.placementRateWith}%`,
    placement_rate_without: `${report.overall.anyTool.placementRateWithout}%`,
    avg_days_with: report.overall.anyTool.avgDaysToPlacementWith ?? 'N/A',
    avg_days_without: report.overall.anyTool.avgDaysToPlacementWithout ?? 'N/A',
    avg_salary_with: report.overall.anyTool.avgSalaryWith ?? 'N/A',
    avg_salary_without: report.overall.anyTool.avgSalaryWithout ?? 'N/A',
    avg_apps_with: report.overall.anyTool.avgJobApplicationsWith,
    avg_apps_without: report.overall.anyTool.avgJobApplicationsWithout,
  });

  for (const t of report.byTool) {
    rows.push({
      tool: t.toolLabel,
      users_with: t.usersWithTool,
      users_without: t.usersWithoutTool,
      placed_with: t.placedWithTool,
      placed_without: t.placedWithoutTool,
      placement_rate_with: `${t.placementRateWith}%`,
      placement_rate_without: `${t.placementRateWithout}%`,
      avg_days_with: t.avgDaysToPlacementWith ?? 'N/A',
      avg_days_without: t.avgDaysToPlacementWithout ?? 'N/A',
      avg_salary_with: t.avgSalaryWith ?? 'N/A',
      avg_salary_without: t.avgSalaryWithout ?? 'N/A',
      avg_apps_with: t.avgJobApplicationsWith,
      avg_apps_without: t.avgJobApplicationsWithout,
    });
  }

  return rows;
}
