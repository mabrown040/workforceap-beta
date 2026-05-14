import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Aggregate metrics for the agent-inbox header card. Rolling-7-day window
 * by default — wide enough to be informative even early in pilot, narrow
 * enough to stay relevant.
 *
 * Implemented as straightforward COUNT / GROUP BY queries — totals are small
 * (cohort of 4 today, scaling to dozens this quarter), no need for materialized
 * views or rollup tables yet.
 */

export interface CascadeMetrics {
  windowDays: number;
  totals: {
    pendingDraft: number;
    awaitingApproval: number;
    sent: number;
    dismissed: number;
    expired: number;
  };
  /** Median minutes between createdAt and draftedAt, over cascades that have
   *  been drafted in the window. `null` when there's no signal yet. */
  medianMinutesToDraft: number | null;
  /** Median minutes between draftedAt and approvedAt/dismissedAt, over
   *  reviewed cascades in the window. `null` when no signal. */
  medianMinutesToReview: number | null;
  /** Of cascades that reached a terminal state (sent/dismissed/expired) in
   *  the window, fraction that ended in `sent`. `null` when no signal. */
  approvalRate: number | null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function minutesBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  const diff = b.getTime() - a.getTime();
  if (diff < 0) return null; // clock skew or out-of-order — drop
  return diff / 60_000;
}

export async function getCascadeMetrics(opts?: {
  windowDays?: number;
}): Promise<CascadeMetrics> {
  const windowDays = opts?.windowDays ?? 7;
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  // Status counts — current snapshot, not windowed.
  const grouped = await prisma.milestoneCascade.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const countByStatus: Record<string, number> = {};
  for (const g of grouped) countByStatus[g.status] = g._count._all;

  // The raw groupBy includes cascades whose 72h TTL has elapsed but which
  // the daily expire cron hasn't flipped to 'expired' yet. The inbox query
  // filters those out (the approve endpoint refuses them anyway), so the
  // "Awaiting review" stat would otherwise read higher than the inbox card
  // count. Override with the actionable-only count for UX consistency.
  const awaitingApprovalActionable = await prisma.milestoneCascade.count({
    where: { status: 'awaiting_approval', expiresAt: { gt: now } },
  });
  countByStatus.awaiting_approval = awaitingApprovalActionable;

  // Timing samples — windowed by createdAt.
  const drafted = await prisma.milestoneCascade.findMany({
    where: {
      createdAt: { gte: windowStart },
      draftedAt: { not: null },
    },
    select: { createdAt: true, draftedAt: true },
  });

  const reviewed = await prisma.milestoneCascade.findMany({
    where: {
      createdAt: { gte: windowStart },
      draftedAt: { not: null },
      OR: [{ approvedAt: { not: null } }, { dismissedAt: { not: null } }],
    },
    select: { draftedAt: true, approvedAt: true, dismissedAt: true, status: true },
  });

  const draftMinutes = drafted
    .map((r) => minutesBetween(r.createdAt, r.draftedAt))
    .filter((v): v is number => v !== null);

  const reviewMinutes = reviewed
    .map((r) =>
      minutesBetween(r.draftedAt, r.approvedAt ?? r.dismissedAt ?? null),
    )
    .filter((v): v is number => v !== null);

  // Approval rate: of cascades reaching a terminal state in the window,
  // fraction that ended in `sent`.
  const terminal = await prisma.milestoneCascade.findMany({
    where: {
      createdAt: { gte: windowStart },
      status: { in: ['sent', 'dismissed', 'expired'] },
    },
    select: { status: true },
  });
  const sentCount = terminal.filter((r) => r.status === 'sent').length;
  const approvalRate = terminal.length === 0 ? null : sentCount / terminal.length;

  return {
    windowDays,
    totals: {
      pendingDraft: countByStatus.pending_draft ?? 0,
      awaitingApproval: countByStatus.awaiting_approval ?? 0,
      sent: countByStatus.sent ?? 0,
      dismissed: countByStatus.dismissed ?? 0,
      expired: countByStatus.expired ?? 0,
    },
    medianMinutesToDraft: median(draftMinutes),
    medianMinutesToReview: median(reviewMinutes),
    approvalRate,
  };
}
