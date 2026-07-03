/**
 * Quarterly Outcomes Report
 *
 * Funder-ready metrics for grant reporting: enrollments, completions,
 * placements, salary data, retention signals, and AI tool usage.
 *
 * Deterministic: same inputs + same DB state = same output.
 */

import { prisma } from '@/lib/db/prisma';
import { memberProgramCompleted } from '@/lib/partner/memberProgress';

export interface QuarterSpec {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  year: number;
}

export interface QuarterlyOutcomesReport {
  quarter: string;
  year: number;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  metrics: {
    totalEnrolled: number;
    completions: number;
    placements: number;
    activeMembers: number;
    dropOffs: number;
    dropOffRate: number; // %
    avgDaysToPlacement: number | null;
    aiToolUsageRate: number | null; // % of placed members who used AI tools
    salaryAvg: number | null;
    salaryMedian: number | null;
    salaryMin: number | null;
    salaryMax: number | null;
  };
  programBreakdown: Array<{
    programSlug: string;
    enrolled: number;
    completions: number;
    placements: number;
  }>;
  placementsList: Array<{
    jobTitle: string;
    employerName: string;
    salaryOffered: number | null;
    placedAt: string;
    daysToPlacement: number | null;
    usedAiTools: boolean;
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

interface EnrolledMemberRow {
  id: string;
  enrolledAt: Date | null;
  enrolledProgram: string | null;
  deletedAt: Date | null;
  courseEnrollments: { programSlug: string; enrolledAt: Date }[];
  courseProgress: { percentComplete: number; completedAt: Date | null; programSlug: string; courseSlug: string }[];
}

async function fetchEnrolledMembers(orgId: string, start: Date, end: Date): Promise<EnrolledMemberRow[]> {
  return prisma.user.findMany({
    take: 5000,
    where: {
      organizationId: orgId,
      deletedAt: null,
      enrolledProgram: { not: null },
      enrolledAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      enrolledAt: true,
      enrolledProgram: true,
      deletedAt: true,
      courseEnrollments: {
        select: { programSlug: true, enrolledAt: true },
      },
      // Unfiltered by date on purpose — completion is a point-in-time state
      // ("has this cohort member finished their program as of NOW"), not an
      // event that only counts if it happened inside this quarter. Training
      // programs run 3-6+ months, so a member who enrolled in Q1 and finished
      // in Q3 must still show as completed; the old completedAt-in-window
      // filter on a separate `fetchCompletions` query silently dropped them.
      courseProgress: {
        select: { percentComplete: true, completedAt: true, programSlug: true, courseSlug: true },
      },
    },
  });
}

/** Completed course slugs for one program, from a member's full courseProgress rows. */
function completedSlugsForProgram(member: EnrolledMemberRow, programSlug: string): string[] {
  return member.courseProgress
    .filter((cp) => cp.programSlug === programSlug && cp.completedAt !== null)
    .map((cp) => cp.courseSlug);
}

interface CompletionRow {
  userId: string;
  programSlug: string;
}

/**
 * Every (user, program) pair the member has actually completed — 100% of
 * that program's courses, per the SAME `memberProgramCompleted` definition
 * `lib/partner/memberProgress.ts` uses for partner/WIOA reports and pipeline
 * staging. Previously this report used its own looser definition ("any one
 * course or any cert earned in-window") which could report a materially
 * different completions count than a partner's quarterly report for the
 * same cohort — see docs note in lib/partner/memberProgress.ts.
 */
function buildCompletionRows(members: ReadonlyArray<EnrolledMemberRow>): CompletionRow[] {
  const rows: CompletionRow[] = [];
  for (const m of members) {
    const slugs = m.enrolledProgram
      ? Array.from(new Set(m.courseEnrollments.map((e) => e.programSlug).concat(m.enrolledProgram)))
      : Array.from(new Set(m.courseEnrollments.map((e) => e.programSlug)));
    for (const slug of slugs) {
      if (memberProgramCompleted(slug, completedSlugsForProgram(m, slug))) {
        rows.push({ userId: m.id, programSlug: slug });
      }
    }
  }
  return rows;
}


async function fetchPlacements(orgId: string, start: Date, end: Date) {
  return prisma.placementRecord.findMany({
    take: 5000,
    where: {
      placedAt: { gte: start, lte: end },
      user: { organizationId: orgId },
    },
    select: {
      id: true,
      userId: true,
      jobTitle: true,
      employerName: true,
      salaryOffered: true,
      placedAt: true,
      user: {
        select: {
          enrolledAt: true,
          enrolledProgram: true,
          courseEnrollments: {
            select: { programSlug: true, enrolledAt: true },
          },
        },
      },
    },
  });
}

async function fetchAiToolUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const results = await prisma.aIToolResult.findMany({
    take: 5000,
    where: { userId: { in: userIds } },
    select: { userId: true },
    distinct: ['userId'],
  });
  return new Set(results.map((r) => r.userId));
}

function attributeProgramAtPlacement(
  enrollments: ReadonlyArray<{ programSlug: string; enrolledAt: Date }>,
  placedAt: Date,
  legacyEnrolledProgram: string | null,
): string | null {
  if (enrollments.length === 0) return legacyEnrolledProgram ?? null;
  if (enrollments.length === 1) return enrollments[0].programSlug;
  const placedMs = placedAt.getTime();
  const eligible = enrollments.filter((e) => e.enrolledAt.getTime() <= placedMs);
  const pool = eligible.length > 0 ? eligible : enrollments;
  let best = pool[0];
  for (const e of pool) {
    if (e.enrolledAt.getTime() > best.enrolledAt.getTime()) best = e;
  }
  return best.programSlug;
}

function isCompleted(member: EnrolledMemberRow, completionSet: Set<string>): boolean {
  return completionSet.has(member.id);
}

function buildCompletedUserSet(completionRows: ReadonlyArray<CompletionRow>): Set<string> {
  const s = new Set<string>();
  for (const c of completionRows) s.add(c.userId);
  return s;
}

function hasStartedTraining(member: EnrolledMemberRow): boolean {
  return member.courseProgress.some((cp) => cp.percentComplete > 0);
}

export async function generateQuarterlyOutcomes(
  orgId: string,
  spec: QuarterSpec
): Promise<QuarterlyOutcomesReport> {
  const { start, end } = quarterToDates(spec);

  const [enrolledMembers, placements] = await Promise.all([
    fetchEnrolledMembers(orgId, start, end),
    fetchPlacements(orgId, start, end),
  ]);
  const completionRows = buildCompletionRows(enrolledMembers);

  const completionSet = buildCompletedUserSet(completionRows);
  const totalEnrolled = enrolledMembers.length;

  // Categorize enrolled members
  const placedUserIds = new Set(placements.map((p) => p.userId));

  // Active = enrolled, not placed, not completed, has started training
  const activeMembers = enrolledMembers.filter(
    (m) =>
      !placedUserIds.has(m.id) &&
      !isCompleted(m, completionSet) &&
      hasStartedTraining(m)
  );

  // Drop-off = enrolled, not placed, not completed, and never started training
  const dropOffMembers = enrolledMembers.filter(
    (m) =>
      !placedUserIds.has(m.id) &&
      !isCompleted(m, completionSet) &&
      !hasStartedTraining(m)
  );

  // Salary stats
  const salaries = placements
    .map((p) => p.salaryOffered)
    .filter((s): s is number => typeof s === 'number' && s > 0);

  // Time to placement
  const daysToPlacement = placements
    .map((p) => {
      if (!p.user.enrolledAt) return null;
      const ms = p.placedAt.getTime() - p.user.enrolledAt.getTime();
      return ms > 0 ? Math.round(ms / (24 * 60 * 60 * 1000)) : null;
    })
    .filter((d): d is number => d !== null);

  // AI tool usage among placed members
  const placedMemberIds = [...placedUserIds];
  const aiToolUserIds = await fetchAiToolUserIds(placedMemberIds);
  const aiToolUsageRate =
    placedMemberIds.length > 0
      ? Math.round((aiToolUserIds.size / placedMemberIds.length) * 100)
      : null;

  // Program breakdown
  const programMap = new Map<
    string,
    { programSlug: string; enrolled: number; completions: number; placements: number }
  >();

  for (const m of enrolledMembers) {
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

  // Attribute completions to programs from the completion rows themselves so
  // learners who enrolled before the quarter but completed during it still
  // count. Dedupe per (user, program) to mirror the previous behaviour of
  // counting one completion per enrolled member per program.
  const completionsByProgram = new Set<string>();
  for (const c of completionRows) {
    if (!c.programSlug) continue;
    const key = `${c.userId}::${c.programSlug}`;
    if (completionsByProgram.has(key)) continue;
    completionsByProgram.add(key);
    const cur = programMap.get(c.programSlug) ?? {
      programSlug: c.programSlug,
      enrolled: 0,
      completions: 0,
      placements: 0,
    };
    cur.completions += 1;
    programMap.set(c.programSlug, cur);
  }

  for (const p of placements) {
    const programSlug = attributeProgramAtPlacement(
      p.user.courseEnrollments,
      p.placedAt,
      p.user.enrolledProgram
    );
    if (!programSlug) continue;
    const cur = programMap.get(programSlug) ?? {
      programSlug,
      enrolled: 0,
      completions: 0,
      placements: 0,
    };
    cur.placements += 1;
    programMap.set(programSlug, cur);
  }

  const programBreakdown = [...programMap.values()].sort((a, b) => b.enrolled - a.enrolled);

  const placementsList = placements.map((p) => ({
    jobTitle: p.jobTitle,
    employerName: p.employerName,
    salaryOffered: p.salaryOffered,
    placedAt: p.placedAt.toISOString(),
    daysToPlacement:
      p.user.enrolledAt && p.placedAt.getTime() > p.user.enrolledAt.getTime()
        ? Math.round((p.placedAt.getTime() - p.user.enrolledAt.getTime()) / (24 * 60 * 60 * 1000))
        : null,
    usedAiTools: aiToolUserIds.has(p.userId),
  }));

  return {
    quarter: spec.quarter,
    year: spec.year,
    periodStart: formatDate(start),
    periodEnd: formatDate(end),
    generatedAt: new Date().toISOString(),
    metrics: {
      totalEnrolled,
      completions: completionSet.size,
      placements: placements.length,
      activeMembers: activeMembers.length,
      dropOffs: dropOffMembers.length,
      dropOffRate: totalEnrolled > 0 ? Math.round((dropOffMembers.length / totalEnrolled) * 100) : 0,
      avgDaysToPlacement: avg(daysToPlacement),
      aiToolUsageRate,
      salaryAvg: avg(salaries),
      salaryMedian: median(salaries),
      salaryMin: salaries.length > 0 ? Math.min(...salaries) : null,
      salaryMax: salaries.length > 0 ? Math.max(...salaries) : null,
    },
    programBreakdown,
    placementsList,
  };
}

export function formatQuarterlyReportMarkdown(report: QuarterlyOutcomesReport): string {
  const m = report.metrics;
  const fmtNum = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-US'));
  const fmtMoney = (n: number | null) =>
    n === null ? '—' : `$${n.toLocaleString('en-US')}`;

  const lines: string[] = [
    `# WorkforceAP Quarterly Outcomes Report`,
    ``,
    `**Quarter:** ${report.quarter} ${report.year}  `,
    `**Period:** ${report.periodStart} → ${report.periodEnd}  `,
    `**Generated:** ${report.generatedAt}`,
    ``,
    `## Summary Metrics`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Total Enrolled | ${fmtNum(m.totalEnrolled)} |`,
    `| Completions | ${fmtNum(m.completions)} |`,
    `| Placements | ${fmtNum(m.placements)} |`,
    `| Active Members | ${fmtNum(m.activeMembers)} |`,
    `| Drop-offs | ${fmtNum(m.dropOffs)} |`,
    `| Drop-off Rate | ${m.dropOffRate}% |`,
    `| Avg Days to Placement | ${fmtNum(m.avgDaysToPlacement)} |`,
    `| AI Tool Usage (placed) | ${m.aiToolUsageRate === null ? '—' : `${m.aiToolUsageRate}%`} |`,
    `| Avg Salary | ${fmtMoney(m.salaryAvg)} |`,
    `| Median Salary | ${fmtMoney(m.salaryMedian)} |`,
    `| Min Salary | ${fmtMoney(m.salaryMin)} |`,
    `| Max Salary | ${fmtMoney(m.salaryMax)} |`,
    ``,
    `## Program Breakdown`,
    ``,
    `| Program | Enrolled | Completions | Placements |`,
    `|---|---:|---:|---:|`,
  ];

  if (report.programBreakdown.length === 0) {
    lines.push(`| *No programs with enrollments* | — | — | — |`);
  } else {
    for (const p of report.programBreakdown) {
      lines.push(`| ${p.programSlug} | ${p.enrolled} | ${p.completions} | ${p.placements} |`);
    }
  }

  lines.push(``, `## Placements (${report.placementsList.length})`, ``);

  if (report.placementsList.length === 0) {
    lines.push(`*No placements recorded for this quarter.*`);
  } else {
    lines.push(`| Job Title | Employer | Salary | Placed | Days to Place | AI Tools |`);
    lines.push(`|---|---|---|---:|---:|---:|`);
    for (const p of report.placementsList) {
      lines.push(
        `| ${p.jobTitle} | ${p.employerName} | ${fmtMoney(p.salaryOffered)} | ${p.placedAt.split('T')[0]} | ${fmtNum(p.daysToPlacement)} | ${p.usedAiTools ? 'Yes' : 'No'} |`
      );
    }
  }

  lines.push(``, `---`, ``);
  lines.push(`*Report generated by WorkforceAP quarterly outcomes exporter.*`);
  lines.push(``);

  return lines.join('\n');
}

export function quarterlyOutcomesToCsvSummary(report: QuarterlyOutcomesReport): Record<string, string | number>[] {
  return [
    {
      quarter: `${report.quarter} ${report.year}`,
      period_start: report.periodStart,
      period_end: report.periodEnd,
      total_enrolled: report.metrics.totalEnrolled,
      completions: report.metrics.completions,
      placements: report.metrics.placements,
      active_members: report.metrics.activeMembers,
      drop_offs: report.metrics.dropOffs,
      drop_off_rate: `${report.metrics.dropOffRate}%`,
      avg_days_to_placement: report.metrics.avgDaysToPlacement ?? 'N/A',
      ai_tool_usage_rate: report.metrics.aiToolUsageRate === null ? 'N/A' : `${report.metrics.aiToolUsageRate}%`,
      salary_avg: report.metrics.salaryAvg ?? 'N/A',
      salary_median: report.metrics.salaryMedian ?? 'N/A',
      salary_min: report.metrics.salaryMin ?? 'N/A',
      salary_max: report.metrics.salaryMax ?? 'N/A',
    },
  ];
}

export function quarterlyOutcomesToCsvPrograms(report: QuarterlyOutcomesReport): Record<string, string | number>[] {
  return report.programBreakdown.map((p) => ({
    program_slug: p.programSlug,
    enrolled: p.enrolled,
    completions: p.completions,
    placements: p.placements,
  }));
}

export function quarterlyOutcomesToCsvPlacements(report: QuarterlyOutcomesReport): Record<string, string | number>[] {
  return report.placementsList.map((p) => ({
    job_title: p.jobTitle,
    employer_name: p.employerName,
    salary_offered: p.salaryOffered ?? 'N/A',
    placed_at: p.placedAt.split('T')[0],
    days_to_placement: p.daysToPlacement ?? 'N/A',
    used_ai_tools: p.usedAiTools ? 'Yes' : 'No',
  }));
}

/** Serialize rows to CSV string. */
export function rowsToCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const val = row[h];
          const str = String(val ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );
  }
  return lines.join('\n');
}
