import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getProgramBySlug } from '@/lib/content/programs';
import { calculateHealthStatus } from '@/lib/admin/healthScore';
import { loadTrainingDashboardData } from '@/lib/admin/trainingDashboard';
import { MEMBER_OR_DOGFOOD_WHERE } from '@/lib/admin/memberOnlyWhere';

/**
 * "Who needs you today" triage digest for the admin home.
 *
 * Rule-based + deterministic — NO LLM call. This runs on every admin visit, so
 * it must be fast and reliable. It reuses the existing aggregate helpers
 * (`loadTrainingDashboardData`, `calculateHealthStatus`) rather than issuing
 * per-member queries, and respects the same tenant/role + soft-delete filtering
 * used across the admin surfaces (`MEMBER_OR_DOGFOOD_WHERE`, `deletedAt: null`).
 */

export type TriageMember = {
  id: string;
  fullName: string;
  /** One-line, plain-language reason this person surfaced in the bucket. */
  reason: string;
  /** Where the "open" link for this person should point. */
  href: string;
};

export type TriageBucketKey = 'new-applicants' | 'at-risk' | 'stalled-training' | 'not-enrolled';

export type TriageBucket = {
  key: TriageBucketKey;
  /** Total members matching this bucket (may exceed `members.length`). */
  count: number;
  /** Plain-language headline shown on the card. */
  label: string;
  /** Material symbol icon name. */
  icon: string;
  /** Accent color for the card. */
  accent: string;
  /** Up to ~5 representative members. */
  members: TriageMember[];
  /** Where the card's primary button points (the relevant list/queue). */
  href: string;
  /** Button label. */
  cta: string;
};

export type TriageDigest = {
  /** Non-empty buckets in priority order. */
  buckets: TriageBucket[];
  /** True when every bucket is empty (nobody is waiting). */
  allClear: boolean;
};

const TOP_N = 5;

function pluralPeople(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getTriageDigest(): Promise<TriageDigest> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Everything runs in parallel and degrades independently — a single failing
  // slice must not blank out the whole digest (mirrors /admin/page error policy).
  const [
    pendingAppsCountResult,
    pendingAppsResult,
    membersResult,
    lastEventsResult,
    recentEventsResult,
    trainingResult,
  ] = await Promise.allSettled([
    prisma.application.count({ where: { status: { in: ['PENDING', 'NEEDS_INFO'] } } }),
    prisma.application.findMany({
      where: { status: { in: ['PENDING', 'NEEDS_INFO'] } },
      orderBy: { submittedAt: 'desc' },
      take: TOP_N,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        programInterest: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    // Member roster for the at-risk health computation. Bounded + soft-delete /
    // role filtered the same way the members list is.
    prisma.user.findMany({
      where: { deletedAt: null, ...MEMBER_OR_DOGFOOD_WHERE },
      take: 3000,
      select: { id: true, fullName: true, email: true, enrolledAt: true },
    }),
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
    loadTrainingDashboardData(),
  ]);

  const buckets: TriageBucket[] = [];

  // ── 1. New applicants awaiting review ──────────────────────────────────
  const pendingAppsCount =
    pendingAppsCountResult.status === 'fulfilled' ? pendingAppsCountResult.value : 0;
  const pendingApps = pendingAppsResult.status === 'fulfilled' ? pendingAppsResult.value : [];
  if (pendingAppsCount > 0) {
    buckets.push({
      key: 'new-applicants',
      count: pendingAppsCount,
      label: `${pendingAppsCount} new ${pluralPeople(pendingAppsCount, 'application', 'applications')} waiting on you`,
      icon: 'assignment_ind',
      accent: '#3b82f6',
      members: pendingApps.map((a) => {
        const interest = a.programInterest
          ? getProgramBySlug(a.programInterest)?.title ?? a.programInterest
          : null;
        const d = daysSince(a.submittedAt);
        const when =
          d == null ? 'just submitted' : d === 0 ? 'submitted today' : `submitted ${d}d ago`;
        const needsInfo = a.status === 'NEEDS_INFO';
        return {
          id: a.user.id,
          fullName: a.user.fullName ?? a.user.email,
          reason: needsInfo
            ? `Needs more info${interest ? ` · ${interest}` : ''}`
            : `${interest ? `${interest} · ` : ''}${when}`,
          href: `/admin/members/${a.user.id}`,
        };
      }),
      href: '/admin/members?applications=pending',
      cta: 'Review applications',
    });
  }

  // ── 2. At-risk (health = red) ──────────────────────────────────────────
  const eventAggregatesOk =
    lastEventsResult.status === 'fulfilled' && recentEventsResult.status === 'fulfilled';
  if (membersResult.status === 'fulfilled' && eventAggregatesOk) {
    const lastEventMap = new Map<string, Date | null>();
    for (const row of lastEventsResult.value) lastEventMap.set(row.userId, row._max.createdAt);
    const recentEventMap = new Map<string, number>();
    for (const row of recentEventsResult.value) recentEventMap.set(row.userId, row._count._all);

    const atRisk = membersResult.value
      .map((m) => {
        const lastEventAt = lastEventMap.get(m.id) ?? null;
        const status = calculateHealthStatus({
          lastEventAt,
          recentEventCount: recentEventMap.get(m.id) ?? 0,
          enrolledAt: m.enrolledAt,
        });
        return { m, status, lastEventAt };
      })
      .filter((r) => r.status === 'red');

    if (atRisk.length > 0) {
      // Most-stale first so the people who've been quiet longest are surfaced.
      atRisk.sort((a, b) => (a.lastEventAt?.getTime() ?? 0) - (b.lastEventAt?.getTime() ?? 0));
      buckets.push({
        key: 'at-risk',
        count: atRisk.length,
        label: `${atRisk.length} ${pluralPeople(atRisk.length, 'student', 'students')} at risk`,
        icon: 'warning',
        accent: '#dc2626',
        members: atRisk.slice(0, TOP_N).map(({ m, lastEventAt }) => {
          const d = daysSince(lastEventAt);
          return {
            id: m.id,
            fullName: m.fullName ?? m.email,
            reason: d == null ? 'No recent activity' : `Quiet for ${d}+ days`,
            href: `/admin/members/${m.id}`,
          };
        }),
        href: '/admin/members?needs=at-risk',
        cta: 'See who needs a nudge',
      });
    }
  }

  // ── 3. Stalled training ────────────────────────────────────────────────
  // ── 4. Not in a course ─────────────────────────────────────────────────
  if (trainingResult.status === 'fulfilled') {
    const STALE_DAYS = 14;
    const rows = trainingResult.value.rows;

    const isStale = (r: (typeof rows)[number]): boolean => {
      if (r.staleTrainingDetectedAt) return true;
      const baseline = r.lastTrainingActivityAt ?? r.enrolledAt;
      if (!baseline) return false;
      return Date.now() - baseline.getTime() > STALE_DAYS * 24 * 60 * 60 * 1000;
    };

    // Stalled: enrolled + started but no activity for 14+ days (or flagged stale),
    // and not already finished.
    const stalled = rows
      .filter((r) => isStale(r) && r.progressPercent < 100 && r.completedCount < r.totalCourses)
      .sort(
        (a, b) =>
          (a.lastTrainingActivityAt?.getTime() ?? a.enrolledAt?.getTime() ?? 0) -
          (b.lastTrainingActivityAt?.getTime() ?? b.enrolledAt?.getTime() ?? 0),
      );

    if (stalled.length > 0) {
      buckets.push({
        key: 'stalled-training',
        count: stalled.length,
        label: `${stalled.length} stalled in training`,
        icon: 'pause_circle',
        accent: '#d97706',
        members: stalled.slice(0, TOP_N).map((r) => {
          const d = daysSince(r.lastTrainingActivityAt ?? r.enrolledAt);
          const when = d == null ? 'no activity yet' : `no activity for ${d}d`;
          return {
            id: r.id,
            fullName: r.fullName,
            reason: `${r.programTitle} · ${r.progressPercent}% done · ${when}`,
            href: `/admin/members/${r.id}`,
          };
        }),
        href: '/admin/members?needs=stalled',
        cta: 'See stalled students',
      });
    }

    // Not in a course: enrolled-eligible members with a program but who have not
    // actually started any course (no active or completed course progress). The
    // training dashboard only contains members with `enrolledProgram` set, so a
    // 0% / 0-active / 0-complete row means "signed up but never opened a course".
    const notInCourse = rows
      .filter((r) => r.activeCourseCount === 0 && r.completedCount === 0 && r.progressPercent <= 0)
      .sort((a, b) => (b.enrolledAt?.getTime() ?? 0) - (a.enrolledAt?.getTime() ?? 0));

    if (notInCourse.length > 0) {
      buckets.push({
        key: 'not-enrolled',
        count: notInCourse.length,
        label: `${notInCourse.length} not started a course yet`,
        icon: 'school',
        accent: '#fbbf24',
        members: notInCourse.slice(0, TOP_N).map((r) => {
          const d = daysSince(r.enrolledAt);
          const when = d == null ? 'recently enrolled' : `enrolled ${d}d ago`;
          return {
            id: r.id,
            fullName: r.fullName,
            reason: `${r.programTitle} · hasn't opened a course · ${when}`,
            href: `/admin/members/${r.id}`,
          };
        }),
        href: '/admin/members?needs=not-started',
        cta: 'Help them get started',
      });
    }
  }

  return { buckets, allClear: buckets.length === 0 };
}
