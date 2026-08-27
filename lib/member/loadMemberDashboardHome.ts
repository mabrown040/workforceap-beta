import { prisma } from '@/lib/db/prisma';
import { withDbRetry } from '@/lib/db/withDbRetry';
import { getProgramBySlug } from '@/lib/content/programs';
import { parseGoalDescription } from '@/lib/member/goalSteps';
import { EVENT_LABELS, getLevelForPoints, getNextLevel } from '@/lib/member/pointsConfig';
import type { NextBestAction } from '@/lib/member/nextBestActions';

/**
 * Kit-default `/dashboard` home loader (SCALE Phase 2).
 *
 * Combines the former page-level fan-out (12 Prisma client calls on the kit
 * path; 24 on `?ui=legacy`) into **one `$transaction`** of at most
 * {@link MEMBER_DASHBOARD_HOME_PRISMA_BUDGET} operations:
 *
 *  1. `user.findUnique` with the nested relations / `_count`s the kit needs
 *  2. `courseProgress.count` for the resolved program slug (skipped when none)
 *
 * Coursera B4B + `maybeAutoSyncCourseraOnDashboard` stay **off this path**.
 * Hourly `coursera-training-sync` owns seeding. `getMemberState` (Redis
 * optional) is not called — the page still renders with no Upstash.
 *
 * `?ui=legacy` does not use this loader and may remain fat.
 */

/** Prisma ops this loader issues on the happy path (1–2). Layout bootstrap is extra. */
export const MEMBER_DASHBOARD_HOME_PRISMA_BUDGET = 2;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ACTIVE_JOB_STATUSES_EXCLUDED = ['REJECTED', 'ACCEPTED'] as const;

export type DashboardPipelineRow = {
  role: string;
  company: string;
  stage: string;
  tone: 'warn' | 'muted' | 'info';
  stageIndex: number;
  stageTotal: number;
  appliedLabel: string;
};

export type DashboardGoalSummary = {
  title: string;
  percent: number;
};

export type DashboardPointsLedgerEntry = {
  label: string;
  amount: number;
  color: 'accent' | 'info' | 'gold';
};

export type MemberDashboardHomeView = {
  firstName: string;
  coursePercent: number;
  programTitle?: string;
  activeJobs: number;
  certs: number;
  points: number;
  currentStreak: number;
  longestStreak: number;
  goals: DashboardGoalSummary[];
  /** Real next step title. Omit rather than invent "Continue your training". */
  nextLesson?: string;
  nextLessonDue?: string;
  /** Honest enrollment status. Omit when no program is on file. */
  programStatus?: string;
  nextBadgeName?: string;
  nextBadgePercent?: number;
  nextBadgeRemaining?: string;
  pipeline: DashboardPipelineRow[];
  certModulesDone: number;
  certModulesTotal: number;
  pointsLedger: DashboardPointsLedgerEntry[];
  pointsThisWeek?: number;
  resumeHref: string;
  coursesHref: string;
  toolkitHref: string;
  jobsHref: string;
  doThisNext: NextBestAction | null;
  /** Prisma client operations issued by this call (happy path ≤ budget). */
  prismaOpCount: number;
};

export type LoadMemberDashboardHomeArgs = {
  userId: string;
  fallbackDisplayName?: string | null;
  /** Orphan auth user: provision then the loader re-reads. */
  provisionIfMissing?: () => Promise<void>;
};

type DashboardHomeTx = {
  user: {
    findUnique: (args: unknown) => Promise<DashboardUserRow | null>;
  };
  courseProgress: {
    count: (args: unknown) => Promise<number>;
  };
};

type DashboardHomeDb = {
  $transaction: <T>(fn: (tx: DashboardHomeTx) => Promise<T>) => Promise<T>;
};

type DashboardUserRow = {
  fullName: string | null;
  enrolledProgram: string | null;
  courseEnrollments: Array<{ programSlug: string }>;
  memberPoints: {
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
  } | null;
  nextBestActions: Array<{
    id: string;
    title: string;
    description: string;
    ctaHref: string;
    ctaLabel: string;
    priority: number;
  }>;
  jobApplications: Array<{
    role: string;
    company: string;
    status: string;
    updatedAt: Date;
  }>;
  goals: Array<{
    title: string;
    description: string | null;
    targetMetricValue: number | null;
    currentMetricValue: number;
  }>;
  pointsTransactions: Array<{
    event: string;
    points: number;
    createdAt: Date;
  }>;
  _count: {
    userCertifications: number;
    jobApplications: number;
  };
};

const STAGE_TONE_BY_STATUS: Record<
  string,
  { label: string; tone: DashboardPipelineRow['tone']; step: number }
> = {
  SAVED: { label: 'Saved', tone: 'muted', step: 0 },
  APPLIED: { label: 'Applied', tone: 'muted', step: 1 },
  PHONE_SCREEN: { label: 'Screening', tone: 'info', step: 2 },
  INTERVIEWING: { label: 'Interviewing', tone: 'warn', step: 3 },
  OFFER: { label: 'Offer', tone: 'warn', step: 3 },
};

export function mapPipelineRows(
  jobs: Array<{ role: string; company: string; status: string; updatedAt: Date }>,
): DashboardPipelineRow[] {
  return jobs.map((job) => {
    const meta = STAGE_TONE_BY_STATUS[job.status] ?? { label: 'Applied', tone: 'muted' as const, step: 1 };
    return {
      role: job.role,
      company: job.company,
      stage: meta.label,
      tone: meta.tone,
      stageIndex: meta.step,
      stageTotal: 3,
      appliedLabel: job.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });
}

export function pointsLedgerColor(event: string): DashboardPointsLedgerEntry['color'] {
  if (event === 'job_application' || event === 'interview_requested' || event === 'placement_recorded') {
    return 'info';
  }
  if (event === 'daily_study' || event.startsWith('referral_') || event === 'program_enrolled') {
    return 'gold';
  }
  return 'accent';
}

export function mapPointsLedger(
  rows: Array<{ event: string; points: number }>,
): DashboardPointsLedgerEntry[] {
  return rows.map((row) => ({
    label: EVENT_LABELS[row.event] ?? 'Points earned',
    amount: row.points,
    color: pointsLedgerColor(row.event),
  }));
}

export function mapGoalSummaries(
  goals: Array<{
    title: string;
    description: string | null;
    targetMetricValue: number | null;
    currentMetricValue: number;
  }>,
): DashboardGoalSummary[] {
  return goals.map((goal) => {
    let percent: number;
    if (goal.targetMetricValue && goal.targetMetricValue > 0) {
      percent = Math.max(0, Math.min(100, Math.round((goal.currentMetricValue / goal.targetMetricValue) * 100)));
    } else {
      const { steps } = parseGoalDescription(goal.description);
      const total = steps.length;
      const done = steps.filter((step) => step.done).length;
      percent = total > 0 ? Math.round((done / total) * 100) : 0;
    }
    return { title: goal.title, percent };
  });
}

export function deriveNextBadge(args: {
  totalPoints: number;
  certCount: number;
}): {
  nextBadgeName: string;
  nextBadgePercent: number;
  nextBadgeRemaining: string;
} {
  const currentLevel = getLevelForPoints(args.totalPoints);
  const nextLevel = getNextLevel(currentLevel.name);
  if (nextLevel) {
    const bandStart = currentLevel.min;
    const bandEnd = nextLevel.min;
    const span = Math.max(1, bandEnd - bandStart);
    const into = Math.max(0, args.totalPoints - bandStart);
    const remainingPts = Math.max(0, bandEnd - args.totalPoints);
    return {
      nextBadgeName: nextLevel.label,
      nextBadgePercent: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
      nextBadgeRemaining: `${remainingPts} ${remainingPts === 1 ? 'point' : 'points'}`,
    };
  }
  return {
    nextBadgeName: args.certCount > 0 ? 'Next certification' : 'First certification',
    nextBadgePercent: 0,
    nextBadgeRemaining: '1 certification',
  };
}

function displayFirstName(
  fullName: string | null | undefined,
  fallback: string | null | undefined,
): string {
  const pick = (value: string | null | undefined): string => {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) return '';
    if (trimmed.includes('@')) return trimmed.split('@')[0] || '';
    return trimmed.split(/\s+/)[0] || '';
  };
  return pick(fullName) || pick(fallback);
}

function emptyHome(fallbackDisplayName: string | null | undefined): MemberDashboardHomeView {
  const firstName = displayFirstName(null, fallbackDisplayName);
  const badge = deriveNextBadge({ totalPoints: 0, certCount: 0 });
  return {
    firstName,
    coursePercent: 0,
    activeJobs: 0,
    certs: 0,
    points: 0,
    currentStreak: 0,
    longestStreak: 0,
    goals: [],
    nextBadgeName: badge.nextBadgeName,
    nextBadgePercent: badge.nextBadgePercent,
    nextBadgeRemaining: badge.nextBadgeRemaining,
    pipeline: [],
    certModulesDone: 0,
    certModulesTotal: 0,
    pointsLedger: [],
    resumeHref: '/dashboard/program',
    coursesHref: '/dashboard/program',
    toolkitHref: '/dashboard/ai-tools',
    jobsHref: '/dashboard/jobs',
    doThisNext: null,
    prismaOpCount: 1,
  };
}

function shapeHome(args: {
  row: DashboardUserRow;
  completedCount: number;
  fallbackDisplayName: string | null | undefined;
  prismaOpCount: number;
}): MemberDashboardHomeView {
  const slug = args.row.courseEnrollments[0]?.programSlug ?? args.row.enrolledProgram ?? null;
  const program = slug ? getProgramBySlug(slug) : undefined;
  const totalCourses = program?.courses?.length ?? 0;
  const pct = totalCourses ? Math.round((args.completedCount / totalCourses) * 100) : 0;
  const firstName = displayFirstName(args.row.fullName, args.fallbackDisplayName);

  const topAction = args.row.nextBestActions[0] ?? null;
  const programHref = slug ? `/dashboard?program=${encodeURIComponent(slug)}` : '/dashboard/program';
  const doThisNext: NextBestAction | null = topAction
    ? {
        id: topAction.id,
        title: topAction.title,
        body: topAction.description,
        href: topAction.ctaHref,
        cta: topAction.ctaLabel,
        variant: 'urgent',
        weight: topAction.priority + 100,
      }
    : null;

  const weekAgo = Date.now() - WEEK_MS;
  const pointsThisWeek = args.row.pointsTransactions
    .filter((tx) => tx.createdAt.getTime() >= weekAgo)
    .reduce((sum, tx) => sum + tx.points, 0);
  const recentLedger = args.row.pointsTransactions.slice(0, 3);
  const totalPoints = args.row.memberPoints?.totalPoints ?? 0;
  const badge = deriveNextBadge({
    totalPoints,
    certCount: args.row._count.userCertifications,
  });

  return {
    firstName,
    coursePercent: pct,
    programTitle: program?.title ?? undefined,
    programStatus: program ? (pct >= 100 ? 'Complete' : 'In progress') : undefined,
    activeJobs: args.row._count.jobApplications,
    certs: args.row._count.userCertifications,
    points: totalPoints,
    currentStreak: args.row.memberPoints?.currentStreak ?? 0,
    longestStreak: args.row.memberPoints?.longestStreak ?? 0,
    goals: mapGoalSummaries(args.row.goals),
    nextLesson: topAction?.title,
    nextBadgeName: badge.nextBadgeName,
    nextBadgePercent: badge.nextBadgePercent,
    nextBadgeRemaining: badge.nextBadgeRemaining,
    pipeline: mapPipelineRows(args.row.jobApplications),
    certModulesDone: args.completedCount,
    certModulesTotal: totalCourses,
    pointsLedger: mapPointsLedger(recentLedger),
    pointsThisWeek: pointsThisWeek > 0 ? pointsThisWeek : undefined,
    resumeHref: topAction?.ctaHref ?? programHref,
    coursesHref: programHref,
    toolkitHref: '/dashboard/ai-tools',
    jobsHref: '/dashboard/jobs',
    doThisNext,
    prismaOpCount: args.prismaOpCount,
  };
}

function userSelect() {
  return {
    fullName: true,
    enrolledProgram: true,
    courseEnrollments: {
      where: { isPrimary: true },
      take: 1,
      select: { programSlug: true },
    },
    memberPoints: {
      select: { totalPoints: true, currentStreak: true, longestStreak: true },
    },
    nextBestActions: {
      where: { status: 'PENDING' },
      orderBy: { priority: 'desc' as const },
      take: 3,
      select: {
        id: true,
        title: true,
        description: true,
        ctaHref: true,
        ctaLabel: true,
        priority: true,
      },
    },
    jobApplications: {
      where: { status: { notIn: [...ACTIVE_JOB_STATUSES_EXCLUDED] } },
      orderBy: { updatedAt: 'desc' as const },
      take: 4,
      select: { role: true, company: true, status: true, updatedAt: true },
    },
    goals: {
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' as const },
      take: 3,
      select: {
        title: true,
        description: true,
        targetMetricValue: true,
        currentMetricValue: true,
      },
    },
    // Newest events: ledger uses the first 3; week chip sums those in the last 7 days.
    // take: 50 is enough for a typical week without a second aggregate query.
    pointsTransactions: {
      orderBy: { createdAt: 'desc' as const },
      take: 50,
      select: { event: true, points: true, createdAt: true },
    },
    _count: {
      select: {
        userCertifications: true,
        jobApplications: {
          where: { status: { notIn: [...ACTIVE_JOB_STATUSES_EXCLUDED] } },
        },
      },
    },
  };
}

async function fetchHomeRow(
  db: DashboardHomeDb,
  userId: string,
): Promise<{ row: DashboardUserRow | null; completedCount: number; prismaOpCount: number }> {
  return db.$transaction(async (tx) => {
    const row = await tx.user.findUnique({
      where: { id: userId },
      select: userSelect(),
    });
    if (!row) {
      return { row: null, completedCount: 0, prismaOpCount: 1 };
    }
    const slug = row.courseEnrollments[0]?.programSlug ?? row.enrolledProgram ?? null;
    if (!slug) {
      return { row, completedCount: 0, prismaOpCount: 1 };
    }
    const completedCount = await tx.courseProgress.count({
      where: { userId, programSlug: slug, status: 'COMPLETED' },
    });
    return { row, completedCount, prismaOpCount: 2 };
  });
}

/**
 * Load kit-home props for `/dashboard` (default UI).
 *
 * `db` is injectable for unit tests. Production uses the shared Prisma client.
 * Redis / `getMemberState` / Coursera are intentionally not in this function.
 */
export async function loadMemberDashboardHome(
  args: LoadMemberDashboardHomeArgs,
  db?: DashboardHomeDb,
): Promise<MemberDashboardHomeView> {
  const client: DashboardHomeDb = db ?? (prisma as unknown as DashboardHomeDb);
  const run = () => fetchHomeRow(client, args.userId);
  let { row, completedCount, prismaOpCount } = await withDbRetry(run);

  if (!row && args.provisionIfMissing) {
    await args.provisionIfMissing();
    ({ row, completedCount, prismaOpCount } = await withDbRetry(run));
  }

  if (!row) {
    return emptyHome(args.fallbackDisplayName);
  }

  return shapeHome({
    row,
    completedCount,
    fallbackDisplayName: args.fallbackDisplayName,
    prismaOpCount,
  });
}
