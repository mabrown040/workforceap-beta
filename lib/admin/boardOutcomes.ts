import { prisma } from '@/lib/db/prisma';
import { memberProgramCompleted, memberProgramProgressPct } from '@/lib/partner/memberProgress';

/**
 * Aggregations for the Board / Funder outcomes portal.
 *
 * The buyer for WorkforceAP is a workforce board / WIOA grant administrator
 * (not the cohort member). This module reduces the raw operational data
 * (User, PlacementRecord, AIToolResult, etc.) into the headline metrics a
 * board pays to see: members served, placement rate, median wage,
 * demographic breakdowns aligned to WIOA ETA reporting categories.
 *
 * Per /plan-ceo-review (2026-04-26): "the board portal is the buyer-facing
 * surface — build it before scaling cohorts." This is the v1 demo cut for
 * a single org / pilot board. Multi-tenant board scoping is a follow-up.
 */

export type BoardOutcomesPeriod = 'all-time' | 'ytd' | 'q-current' | 'q-prev';

export type BoardOutcomes = {
  period: { label: string; startDate: Date | null; endDate: Date };
  totals: {
    membersServed: number;
    membersEnrolled: number;
    membersInTraining: number;
    membersCertified: number;
    membersPlaced: number;
    placementRate: number; // %, of enrolled
    medianAnnualSalary: number | null;
    totalAnnualSalaryValue: number; // sum of placed salaries
    averageWeeksToPlacement: number | null;
  };
  funnel: Array<{ stage: string; count: number }>;
  demographics: {
    veteranBreakdown: Array<{ label: string; count: number }>;
    employmentEnteringBreakdown: Array<{ label: string; count: number }>;
    incomeBreakdown: Array<{ label: string; count: number }>;
    educationBreakdown: Array<{ label: string; count: number }>;
    ethnicityBreakdown: Array<{ label: string; count: number }>;
  };
  programs: Array<{
    programSlug: string;
    enrolled: number;
    certified: number;
    placed: number;
    placementRate: number;
  }>;
  /** PII-stripped placement list for the funder report */
  placements: Array<{
    jobTitle: string;
    employerIndustry: string | null;
    annualSalary: number | null;
    enrolledProgram: string | null;
    weeksFromEnrollmentToPlacement: number | null;
    placedAt: Date;
  }>;
};

function startOfPeriod(period: BoardOutcomesPeriod): Date | null {
  const now = new Date();
  if (period === 'all-time') return null;
  if (period === 'ytd') return new Date(now.getFullYear(), 0, 1);
  const month = now.getMonth();
  const qStartMonth = month - (month % 3);
  if (period === 'q-current') return new Date(now.getFullYear(), qStartMonth, 1);
  // q-prev
  const prevQStart = new Date(now.getFullYear(), qStartMonth - 3, 1);
  return prevQStart;
}

function endOfPeriod(period: BoardOutcomesPeriod): Date {
  const now = new Date();
  if (period !== 'q-prev') return now;
  const month = now.getMonth();
  const qStartMonth = month - (month % 3);
  // Last day of previous quarter = day before this quarter starts
  return new Date(now.getFullYear(), qStartMonth, 0, 23, 59, 59);
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function bucketCount<T extends string | null>(rows: Array<{ value: T }>, buckets: string[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const b of buckets) counts.set(b, 0);
  let unknown = 0;
  for (const row of rows) {
    const v = row.value;
    if (!v) {
      unknown += 1;
      continue;
    }
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const out = [...counts.entries()].map(([label, count]) => ({ label, count }));
  if (unknown > 0) out.push({ label: 'Not reported', count: unknown });
  return out.filter((r) => r.count > 0);
}

const VETERAN_BUCKETS = ['Not a Veteran', 'Veteran', 'Disabled Veteran'];
const EMPLOYMENT_BUCKETS = ['Unemployed', 'Underemployed', 'Employed', 'Self-Employed'];
const INCOME_BUCKETS = ['Under $20K', '$20K–$40K', '$40K–$60K', 'Over $60K'];
const EDUCATION_BUCKETS = [
  'Less than HS',
  'HS Diploma or GED',
  'Some College',
  "Associate's",
  "Bachelor's",
  'Graduate',
];

export async function getBoardOutcomes(period: BoardOutcomesPeriod = 'all-time'): Promise<BoardOutcomes> {
  const start = startOfPeriod(period);
  const end = endOfPeriod(period);
  const periodLabel = (
    {
      'all-time': 'All time',
      ytd: `${new Date().getFullYear()} year to date`,
      'q-current': `${currentQuarterLabel(new Date())}`,
      'q-prev': `${prevQuarterLabel(new Date())}`,
    } as const
  )[period];

  // Members enrolled within the period (or any time, for all-time)
  const enrolledWhere = {
    deletedAt: null,
    enrolledProgram: { not: null },
    ...(start ? { enrolledAt: { gte: start, lte: end } } : {}),
  } as const;

  const [enrolledMembers, placements, profileRows] = await Promise.all([
    prisma.user.findMany({
      where: enrolledWhere,
      select: {
        id: true,
        enrolledProgram: true,
        enrolledAt: true,
        memberProgramProgress: {
          select: { programSlug: true, averagePercent: true, coursesCompleted: true },
        },
        profile: {
          select: {
            veteranStatus: true,
            employmentStatus: true,
            householdIncome: true,
            educationLevel: true,
            ethnicity: true,
          },
        },
      },
    }),
    prisma.placementRecord.findMany({
      where: start ? { placedAt: { gte: start, lte: end } } : undefined,
      select: {
        id: true,
        userId: true,
        employerName: true,
        jobTitle: true,
        startDate: true,
        salaryOffered: true,
        placedAt: true,
        user: {
          select: { enrolledProgram: true, enrolledAt: true },
        },
      },
    }),
    prisma.profile.findMany({
      where: start
        ? { user: { ...enrolledWhere } }
        : { user: { deletedAt: null, enrolledProgram: { not: null } } },
      select: {
        veteranStatus: true,
        employmentStatus: true,
        householdIncome: true,
        educationLevel: true,
        ethnicity: true,
      },
    }),
  ]);

  // Members served = enrolled in period
  const membersServed = enrolledMembers.length;
  const membersInTraining = enrolledMembers.filter((m) => {
    const pct = memberProgramProgressPct(m.enrolledProgram, null, m.memberProgramProgress);
    return pct > 0 && pct < 100;
  }).length;
  const membersCertified = enrolledMembers.filter((m) =>
    memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress),
  ).length;
  const membersPlaced = placements.length;
  const placementRate = membersServed > 0 ? Math.round((membersPlaced / membersServed) * 100) : 0;

  const salaries = placements
    .map((p) => p.salaryOffered)
    .filter((s): s is number => typeof s === 'number' && s > 0);
  const medianAnnualSalary = median(salaries);
  const totalAnnualSalaryValue = salaries.reduce((a, b) => a + b, 0);

  const weeksToPlacement = placements
    .map((p) => {
      if (!p.user.enrolledAt) return null;
      const ms = p.placedAt.getTime() - p.user.enrolledAt.getTime();
      return ms > 0 ? Math.round(ms / (7 * 24 * 60 * 60 * 1000)) : null;
    })
    .filter((w): w is number => w !== null && w >= 0);
  const averageWeeksToPlacement =
    weeksToPlacement.length > 0
      ? Math.round(weeksToPlacement.reduce((a, b) => a + b, 0) / weeksToPlacement.length)
      : null;

  // Programs breakdown
  const programs = new Map<
    string,
    { programSlug: string; enrolled: number; certified: number; placed: number }
  >();
  for (const m of enrolledMembers) {
    if (!m.enrolledProgram) continue;
    const cur = programs.get(m.enrolledProgram) ?? {
      programSlug: m.enrolledProgram,
      enrolled: 0,
      certified: 0,
      placed: 0,
    };
    cur.enrolled += 1;
    if (memberProgramCompleted(m.enrolledProgram, null, m.memberProgramProgress)) {
      cur.certified += 1;
    }
    programs.set(m.enrolledProgram, cur);
  }
  for (const p of placements) {
    if (!p.user.enrolledProgram) continue;
    const cur = programs.get(p.user.enrolledProgram) ?? {
      programSlug: p.user.enrolledProgram,
      enrolled: 0,
      certified: 0,
      placed: 0,
    };
    cur.placed += 1;
    programs.set(p.user.enrolledProgram, cur);
  }
  const programsList = [...programs.values()]
    .map((p) => ({
      ...p,
      placementRate: p.enrolled > 0 ? Math.round((p.placed / p.enrolled) * 100) : 0,
    }))
    .sort((a, b) => b.enrolled - a.enrolled);

  // Demographics
  const veteranBreakdown = bucketCount(profileRows.map((p) => ({ value: p.veteranStatus })), VETERAN_BUCKETS);
  const employmentEnteringBreakdown = bucketCount(
    profileRows.map((p) => ({ value: p.employmentStatus })),
    EMPLOYMENT_BUCKETS,
  );
  const incomeBreakdown = bucketCount(profileRows.map((p) => ({ value: p.householdIncome })), INCOME_BUCKETS);
  const educationBreakdown = bucketCount(
    profileRows.map((p) => ({ value: p.educationLevel })),
    EDUCATION_BUCKETS,
  );
  const ethnicityBreakdown = bucketCount(
    profileRows.map((p) => ({ value: p.ethnicity })),
    [
      'Hispanic/Latino',
      'White',
      'Black or African American',
      'Asian',
      'American Indian or Alaska Native',
      'Native Hawaiian or Pacific Islander',
      'Two or More Races',
    ],
  );

  return {
    period: { label: periodLabel, startDate: start, endDate: end },
    totals: {
      membersServed,
      membersEnrolled: membersServed,
      membersInTraining,
      membersCertified,
      membersPlaced,
      placementRate,
      medianAnnualSalary,
      totalAnnualSalaryValue,
      averageWeeksToPlacement,
    },
    funnel: [
      { stage: 'Enrolled', count: membersServed },
      { stage: 'In training', count: membersInTraining },
      { stage: 'Certified', count: membersCertified },
      { stage: 'Placed', count: membersPlaced },
    ],
    demographics: {
      veteranBreakdown,
      employmentEnteringBreakdown,
      incomeBreakdown,
      educationBreakdown,
      ethnicityBreakdown,
    },
    programs: programsList,
    placements: placements.map((p) => ({
      jobTitle: p.jobTitle,
      employerIndustry: null,
      annualSalary: p.salaryOffered,
      enrolledProgram: p.user.enrolledProgram,
      weeksFromEnrollmentToPlacement:
        p.user.enrolledAt
          ? Math.max(0, Math.round((p.placedAt.getTime() - p.user.enrolledAt.getTime()) / (7 * 24 * 60 * 60 * 1000)))
          : null,
      placedAt: p.placedAt,
    })),
  };
}

function currentQuarterLabel(date: Date): string {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

function prevQuarterLabel(date: Date): string {
  let q = Math.floor(date.getMonth() / 3) + 1 - 1;
  let y = date.getFullYear();
  if (q === 0) {
    q = 4;
    y -= 1;
  }
  return `Q${q} ${y}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Board Snapshot — single defensible source of truth for any external pitch.
// ───────────────────────────────────────────────────────────────────────────
//
// `getBoardSnapshot()` is the function any pitch deck, WIOA submission, partner
// PDF, or employer one-pager should pull from. Every number here is sourced
// from a documented Prisma query (see docs/OUTCOMES-METHODOLOGY.md).
//
// Discipline:
//   - When N < SMALL_SAMPLE_THRESHOLD, rates are suppressed and replaced with
//     a "sample too small" marker. Counts are still shown.
//   - The `generatedAt` timestamp ships with every export so a stale PDF is
//     obvious to anyone reading it.
//   - `dataQuality` flags rows we know are incomplete — these are the things
//     a WIOA auditor will ask about.

export const SMALL_SAMPLE_THRESHOLD = 10;

export type BoardSnapshotApplicationFunnel = {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  needsInfo: number;
};

export type BoardSnapshotActivity = {
  totalMembers: number;
  active7d: number;
  active14d: number;
  active30d: number;
  inactive14d: number;
};

export type BoardSnapshotCertifications = {
  totalEarned: number;
  earnedLast30d: number;
  uniqueMembers: number;
};

export type BoardSnapshotDataQuality = {
  placementsMissingProgram: number;
  placementsMissingFunding: number;
  placementsMissingRetention: number;
  placementsMissingSalary: number;
  enrolledWithoutEnrolledAt: number;
};

export type BoardSnapshot = {
  generatedAt: Date;
  smallSampleThreshold: number;
  applicationFunnel: BoardSnapshotApplicationFunnel;
  outcomes: BoardOutcomes;
  activity: BoardSnapshotActivity;
  certifications: BoardSnapshotCertifications;
  dataQuality: BoardSnapshotDataQuality;
};

/**
 * Single source of truth for any external pitch (TWC/EdVera, employers,
 * partners, board). Composes `getBoardOutcomes()` with the application
 * funnel, activity recency, certification counts, and data-quality flags.
 *
 * Period defaults to all-time so funders see the cumulative story.
 */
export async function getBoardSnapshot(period: BoardOutcomesPeriod = 'all-time'): Promise<BoardSnapshot> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    outcomes,
    applicationsByStatus,
    totalMembers,
    active7dRows,
    active14dRows,
    active30dRows,
    totalCerts,
    certsLast30d,
    uniqueCertMembers,
    placementsMissingProgram,
    placementsMissingFunding,
    placementsMissingRetention,
    placementsMissingSalary,
    enrolledWithoutEnrolledAt,
  ] = await Promise.all([
    getBoardOutcomes(period),
    prisma.application.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.memberEvent.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.memberEvent.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.memberEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.userCertification.count(),
    prisma.userCertification.count({ where: { earnedAt: { gte: thirtyDaysAgo } } }),
    prisma.userCertification.findMany({
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.placementRecord.count({ where: { programSlug: null } }),
    prisma.placementRecord.count({ where: { fundingSource: null } }),
    prisma.placementRecord.count({
      where: { AND: [{ retentionStatus: null }, { retentionDecision: null }] },
    }),
    prisma.placementRecord.count({ where: { salaryOffered: null } }),
    prisma.user.count({
      where: { deletedAt: null, enrolledProgram: { not: null }, enrolledAt: null },
    }),
  ]);

  const funnelMap = new Map(applicationsByStatus.map((r) => [r.status, r._count._all]));
  const applicationFunnel: BoardSnapshotApplicationFunnel = {
    total: applicationsByStatus.reduce((sum, r) => sum + r._count._all, 0),
    pending: funnelMap.get('PENDING') ?? 0,
    approved: funnelMap.get('APPROVED') ?? 0,
    denied: funnelMap.get('DENIED') ?? 0,
    needsInfo: funnelMap.get('NEEDS_INFO') ?? 0,
  };

  const active14dSet = new Set(active14dRows.map((r) => r.userId));
  const inactive14d = Math.max(0, totalMembers - active14dSet.size);

  return {
    generatedAt: now,
    smallSampleThreshold: SMALL_SAMPLE_THRESHOLD,
    applicationFunnel,
    outcomes,
    activity: {
      totalMembers,
      active7d: active7dRows.length,
      active14d: active14dRows.length,
      active30d: active30dRows.length,
      inactive14d,
    },
    certifications: {
      totalEarned: totalCerts,
      earnedLast30d: certsLast30d,
      uniqueMembers: uniqueCertMembers.length,
    },
    dataQuality: {
      placementsMissingProgram,
      placementsMissingFunding,
      placementsMissingRetention,
      placementsMissingSalary,
      enrolledWithoutEnrolledAt,
    },
  };
}

/**
 * Format a `BoardSnapshot` as a printable single-page Markdown summary.
 *
 * This is what Dad walks into TWC, AAUL, or a corporate co-funder room with.
 * The footer carries the generation timestamp so a stale PDF never gets
 * mistaken for live data.
 */
export function formatBoardSnapshotMarkdown(snapshot: BoardSnapshot): string {
  const { generatedAt, applicationFunnel, outcomes, activity, certifications, dataQuality } = snapshot;
  const t = outcomes.totals;

  const fmtNumber = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return '—';
    return n.toLocaleString('en-US');
  };
  const fmtMoney = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return '—';
    return `$${n.toLocaleString('en-US')}`;
  };
  const fmtRate = (numerator: number, denominator: number): string => {
    if (denominator < SMALL_SAMPLE_THRESHOLD) {
      return `(N=${denominator}; sample too small for a reliable rate)`;
    }
    const pct = Math.round((numerator / denominator) * 100);
    return `${pct}% (${numerator}/${denominator})`;
  };
  const fmtDate = (d: Date): string =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const lines: string[] = [];
  lines.push(`# WorkforceAP Outcomes Snapshot`);
  lines.push('');
  lines.push(`**Period:** ${outcomes.period.label}  `);
  lines.push(`**Generated:** ${fmtDate(generatedAt)} at ${generatedAt.toLocaleTimeString('en-US')}  `);
  lines.push(`**Source:** Live production data via \`getBoardSnapshot()\``);
  lines.push('');
  lines.push('> All numbers in this snapshot are pulled live from the WorkforceAP database. Where');
  lines.push(`> the underlying sample is below ${SMALL_SAMPLE_THRESHOLD}, rates are suppressed and replaced with a sample-size note —`);
  lines.push('> deliberately, to avoid presenting unreliable proportions to funders.');
  lines.push('');

  // 1. Application funnel
  lines.push('## 1. Application Funnel');
  lines.push('');
  lines.push(`- **Total applications received:** ${fmtNumber(applicationFunnel.total)}`);
  lines.push(`- Pending review: ${fmtNumber(applicationFunnel.pending)}`);
  lines.push(`- Approved: ${fmtNumber(applicationFunnel.approved)}`);
  lines.push(`- Needs info: ${fmtNumber(applicationFunnel.needsInfo)}`);
  lines.push(`- Denied: ${fmtNumber(applicationFunnel.denied)}`);
  lines.push('');
  lines.push(`*Source: \`applications\` table grouped by \`status\`.*`);
  lines.push('');

  // 2. Member outcomes funnel
  lines.push('## 2. Member Outcomes Funnel');
  lines.push('');
  lines.push(`- **Members served (enrolled):** ${fmtNumber(t.membersEnrolled)}`);
  lines.push(`- In active training: ${fmtNumber(t.membersInTraining)}`);
  lines.push(`- Certified: ${fmtNumber(t.membersCertified)}`);
  lines.push(`- Placed in employment: ${fmtNumber(t.membersPlaced)}`);
  lines.push('');
  lines.push(`- **Placement rate:** ${fmtRate(t.membersPlaced, t.membersEnrolled)}`);
  lines.push(`- Median annual salary at placement: ${fmtMoney(t.medianAnnualSalary)}`);
  lines.push(`- Total annual salary value: ${fmtMoney(t.totalAnnualSalaryValue)}`);
  lines.push(
    `- Average weeks from enrollment to placement: ${
      t.averageWeeksToPlacement === null ? '—' : `${t.averageWeeksToPlacement} weeks`
    }`,
  );
  lines.push('');
  lines.push(`*Source: \`users\` (enrolled) + \`placement_records\` joined on user.*`);
  lines.push('');

  // 3. Activity recency
  lines.push('## 3. Member Activity (Engagement)');
  lines.push('');
  lines.push(`- Total members in system: ${fmtNumber(activity.totalMembers)}`);
  lines.push(`- Active in last 7 days: ${fmtNumber(activity.active7d)}`);
  lines.push(`- Active in last 14 days: ${fmtNumber(activity.active14d)}`);
  lines.push(`- Active in last 30 days: ${fmtNumber(activity.active30d)}`);
  lines.push(`- Inactive 14+ days: ${fmtNumber(activity.inactive14d)}`);
  lines.push('');
  lines.push(`*Source: distinct \`user_id\` from \`member_events\` within each window.*`);
  lines.push('');

  // 4. Certifications
  lines.push('## 4. Certifications Earned');
  lines.push('');
  lines.push(`- Total certifications recorded: ${fmtNumber(certifications.totalEarned)}`);
  lines.push(`- Earned in last 30 days: ${fmtNumber(certifications.earnedLast30d)}`);
  lines.push(`- Unique members holding at least one certification: ${fmtNumber(certifications.uniqueMembers)}`);
  lines.push('');
  lines.push(`*Source: \`user_certifications\` table.*`);
  lines.push('');

  // 5. Programs breakdown
  lines.push('## 5. Programs');
  lines.push('');
  if (outcomes.programs.length === 0) {
    lines.push('*No enrolled members yet.*');
  } else {
    lines.push('| Program | Enrolled | Certified | Placed | Placement Rate |');
    lines.push('|---|---:|---:|---:|---:|');
    for (const p of outcomes.programs) {
      const rate =
        p.enrolled < SMALL_SAMPLE_THRESHOLD
          ? `(N=${p.enrolled})`
          : `${p.placementRate}%`;
      lines.push(`| ${p.programSlug} | ${p.enrolled} | ${p.certified} | ${p.placed} | ${rate} |`);
    }
  }
  lines.push('');
  lines.push(`*Source: \`users.enrolled_program\` joined with \`placement_records\` and program progress rollups.*`);
  lines.push('');

  // 6. Data quality flags
  lines.push('## 6. Data Quality Flags');
  lines.push('');
  lines.push('These are rows that exist in production but are missing fields a WIOA');
  lines.push('reviewer or board funder is likely to ask about. They are visible here');
  lines.push('so the team can fix them before any external review.');
  lines.push('');
  lines.push(`- Placements missing program slug: ${fmtNumber(dataQuality.placementsMissingProgram)}`);
  lines.push(`- Placements missing funding source: ${fmtNumber(dataQuality.placementsMissingFunding)}`);
  lines.push(`- Placements missing retention status / decision: ${fmtNumber(dataQuality.placementsMissingRetention)}`);
  lines.push(`- Placements missing salary at placement: ${fmtNumber(dataQuality.placementsMissingSalary)}`);
  lines.push(`- Enrolled members missing \`enrolled_at\` timestamp: ${fmtNumber(dataQuality.enrolledWithoutEnrolledAt)}`);
  lines.push('');

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*WorkforceAP outcomes snapshot generated ${fmtDate(generatedAt)}. Methodology: \`docs/OUTCOMES-METHODOLOGY.md\`.*`);
  lines.push('');

  return lines.join('\n');
}
