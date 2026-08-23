import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { buildPageMetadataAsync } from '@/app/seo';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/db/prisma';
import { ADMIN_SSR_LIST_CAP } from '@/lib/db/queryCaps';
import { getProgramBySlug } from '@/lib/content/programs';
import { calculateHealthStatus } from '@/lib/admin/healthScore';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';
import {
  StudentsRosterKit,
  type StudentRow,
  type StudentStatus,
} from '@/components/portal/kit/pages/admin-subviews/StudentsRosterKit';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin');
  return buildPageMetadataAsync({
    title: t('adminStudents') || 'Students',
    description: t('studentListAndManagement') || 'View and manage student accounts',
    path: '/admin/students',
  });
}

/** Cap the lean roster so first paint stays cheap. The kit filters client-side. */
const ROSTER_LIMIT = 50;

/** Build initials from a full name (e.g. "Jasmine Davis" → "JD"). */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "2h ago" / "5d ago" style caption from a timestamp (null → "—"). */
function relativeTime(date: Date | null): string {
  if (!date) return '—';
  const ms = Date.now() - date.getTime();
  if (ms < 0) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/**
 * Map a member row + derived signals onto the kit's 5-value StudentStatus.
 * Priority (first match wins):
 *   Placed       → admin memberStatus = placed
 *   Interviewing → interview requested but not yet completed/placed
 *   At Risk      → health = red/yellow (low recent activity)
 *   Job-Ready    → readiness (assessment) >= 70 OR progress >= 80
 *   In Training  → default
 */
function deriveStatus(args: {
  memberStatus: string | null;
  interviewRequestedAt: Date | null;
  interviewCompletedAt: Date | null;
  health: 'green' | 'yellow' | 'red';
  readiness: number;
  progress: number;
}): StudentStatus {
  if (args.memberStatus === 'placed') return 'Placed';
  if (args.interviewRequestedAt && !args.interviewCompletedAt) return 'Interviewing';
  if (args.health === 'red' || args.health === 'yellow') return 'At Risk';
  if (args.readiness >= 70 || args.progress >= 80) return 'Job-Ready';
  return 'In Training';
}

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getUser();
  if (!user) redirect('/login?redirectTo=/admin/students');

  const hasAdmin = await isAdmin(user.id);
  if (!hasAdmin) redirect('/dashboard');

  const params = (await searchParams) ?? {};
  const requestedUi = typeof params.ui === 'string' ? params.ui : null;

  // Legacy → forward to the real members workspace (preserves the prior default).
  if (requestedUi === 'legacy') {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string' && key !== 'ui') query.set(key, value);
    });
    const queryString = query.toString();
    redirect(`/admin/members${queryString ? `?${queryString}` : ''}`);
  }

  // --- DEFAULT: real (lean) student roster wired into StudentsRosterKit ---

  const whereClause = {
    ...MEMBER_OR_DOGFOOD_WHERE,
    deletedAt: null,
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Lean roster + full count + light activity/progress aggregates, all in
  // parallel. Aggregate failures degrade gracefully (members list must show).
  const [membersResult, totalResult, lastEventsResult, recentEventsResult] =
    await Promise.allSettled([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        take: ROSTER_LIMIT,
        select: {
          id: true,
          fullName: true,
          enrolledProgram: true,
          enrolledAt: true,
          assessmentScorePct: true,
          memberStatus: true,
          interviewRequestedAt: true,
          interviewCompletedAt: true,
          lastLoginAt: true,
          updatedAt: true,
          profile: { select: { city: true, state: true } },
        },
      }),
      prisma.user.count({ where: whereClause }),
      prisma.memberEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _max: { createdAt: true },
      }),
      prisma.memberEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: { _all: true },
      }),
    ]);

  // If the core roster query fails, fall back to the proven members workspace
  // rather than rendering a fabricated/empty kit.
  if (membersResult.status === 'rejected') {
    console.error('[admin/students] roster load failed', membersResult.reason);
    redirect('/admin/members');
  }

  const members = membersResult.value;
  const total = totalResult.status === 'fulfilled' ? totalResult.value : members.length;

  const lastEventMap = new Map<string, Date | null>();
  if (lastEventsResult.status === 'fulfilled') {
    for (const row of lastEventsResult.value) lastEventMap.set(row.userId, row._max.createdAt);
  }

  const recentEventMap = new Map<string, number>();
  if (recentEventsResult.status === 'fulfilled') {
    for (const row of recentEventsResult.value) recentEventMap.set(row.userId, row._count._all);
  }

  const eventAggregatesOk =
    lastEventsResult.status === 'fulfilled' && recentEventsResult.status === 'fulfilled';

  const programProgressRows = await prisma.memberProgramProgress
    .findMany({
      take: ADMIN_SSR_LIST_CAP,
      where: { userId: { in: members.map((m) => m.id) } },
      select: { userId: true, programSlug: true, averagePercent: true },
    })
    .catch((reason: unknown) => {
      console.error('[admin/students] program progress load failed', reason);
      return [] as Array<{ userId: string; programSlug: string; averagePercent: number }>;
    });
  const programProgressMap = new Map<string, number>();
  for (const row of programProgressRows) {
    programProgressMap.set(`${row.userId}:${row.programSlug}`, row.averagePercent);
  }

  // One extra query over the already-loaded page of members: resolve each
  // member's active counselor. The counselor's display name lives on the
  // related User (Counselor has no name field of its own). A failure here just
  // leaves counselors "Unassigned" — the roster still renders.
  const counselorAssignmentsResult = await prisma.counselorAssignment
    .findMany({
      where: { memberId: { in: members.map((m) => m.id) }, active: true },
      select: {
        memberId: true,
        counselor: { select: { user: { select: { fullName: true } } } },
      },
    })
    .catch((reason: unknown) => {
      console.error('[admin/students] counselor assignment load failed', reason);
      return [] as { memberId: string; counselor: { user: { fullName: string } } }[];
    });

  const counselorNameMap = new Map<string, string>();
  for (const row of counselorAssignmentsResult) {
    const name = row.counselor.user.fullName?.trim();
    if (name) counselorNameMap.set(row.memberId, name);
  }

  const students: StudentRow[] = members.map((m) => {
    const programTitle = m.enrolledProgram
      ? getProgramBySlug(m.enrolledProgram)?.title ?? m.enrolledProgram
      : 'Unassigned';

    const progress = m.enrolledProgram
      ? Math.round(programProgressMap.get(`${m.id}:${m.enrolledProgram}`) ?? 0)
      : 0;

    const readiness = m.assessmentScorePct ?? 0;

    // When event aggregates are unavailable, treat health as green so members
    // are not misclassified "At Risk" purely from a degraded aggregate.
    const health = eventAggregatesOk
      ? calculateHealthStatus({
          lastEventAt: lastEventMap.get(m.id) ?? null,
          recentEventCount: recentEventMap.get(m.id) ?? 0,
          enrolledAt: m.enrolledAt,
        })
      : 'green';

    const status = deriveStatus({
      memberStatus: m.memberStatus,
      interviewRequestedAt: m.interviewRequestedAt,
      interviewCompletedAt: m.interviewCompletedAt,
      health,
      readiness,
      progress,
    });

    const city = m.profile?.city?.trim();
    const state = m.profile?.state?.trim();
    const location = city && state ? `${city}, ${state}` : city || state || '—';

    return {
      id: m.id,
      name: m.fullName,
      initials: initialsFrom(m.fullName),
      location,
      program: programTitle,
      progress,
      readiness,
      // Real counselor from the active CounselorAssignment (name via the
      // counselor's linked User); no active assignment → "Unassigned".
      counselor: counselorNameMap.get(m.id) ?? 'Unassigned',
      status,
      lastActive: relativeTime(m.lastLoginAt ?? m.updatedAt ?? null),
    };
  });

  return <StudentsRosterKit students={students} total={total} />;
}
