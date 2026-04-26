import { prisma } from '@/lib/db/prisma';

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
        coursesCompleted: true,
        assessmentCompleted: true,
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
  const membersInTraining = enrolledMembers.filter((m) => m.enrolledProgram && !m.assessmentCompleted).length;
  const membersCertified = enrolledMembers.filter(
    (m) => Array.isArray(m.coursesCompleted) && (m.coursesCompleted as unknown[]).length > 0,
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
    if (Array.isArray(m.coursesCompleted) && (m.coursesCompleted as unknown[]).length > 0) {
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
