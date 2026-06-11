/**
 * Counselor Priority Queue data shaper (Sprint R5 — inbox zero).
 *
 * Wraps the existing `getTriageQueue` flag engine plus the lightweight
 * roster query so the dashboard can render a single sortable table with
 * three buckets:
 *
 *   - CRITICAL  : red rows from the triage queue (no_activity_10d, sla_breach_48h)
 *   - WARNING   : yellow rows (sla_warning_24h, stale_training, computer_support_followup)
 *   - ON TRACK  : enrolled members assigned to the counselor who have NO flag
 *
 * "Blue" milestone rows from the triage queue are folded into ON TRACK —
 * they aren't urgent triage, they're celebration nudges, and the priority
 * queue is a tactical view, not a celebration feed.
 *
 * The shaper does not duplicate the at-risk cron's scoring query; it relies
 * on the same `MemberEvent` / `User` signals via `getTriageQueue`. The
 * cron persists alerts; this surface reads live state.
 */

import { prisma } from '@/lib/db/prisma';
import {
  getTriageQueue,
  FLAG_LABELS,
  type TriageRow,
  type TriageFlagType,
} from '@/lib/counselor/triageFlags';
import { resolveAdminEnrolledMemberIds } from '@/lib/counselor/adminMemberScope';

export type PriorityBucket = 'critical' | 'warning' | 'ontrack';

export type PriorityQueueRow = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  enrolledProgram: string | null;
  bucket: PriorityBucket;
  /** Days since the member's last logged activity event (best estimate). */
  daysSinceLogin: number | null;
  /** Hours since the last unanswered member message, if any. */
  hoursWaitingReply: number | null;
  /** Short human-readable primary blocker reason for the row. */
  blockerReason: string;
  /** Stable timestamp for "recency of last contact" sort. */
  lastContactAt: Date | null;
  /** All flags surfaced by the triage engine for this member. */
  flags: TriageFlagType[];
  /** Thread id for the counselor-member thread, when available. */
  threadId: string | null;
};

export type PriorityQueueData = {
  rows: PriorityQueueRow[];
  totals: {
    critical: number;
    warning: number;
    ontrack: number;
    total: number;
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

async function resolvePriorityQueueMemberIds(
  counselorUserId: string,
  options?: { isAdmin?: boolean; adminMemberCap?: number },
): Promise<string[]> {
  const adminCap = options?.adminMemberCap ?? 200;
  const counselor = await prisma.counselor.findFirst({
    where: { userId: counselorUserId, active: true },
    select: { id: true },
  });

  if (counselor) {
    const assignments = await prisma.counselorAssignment.findMany({
      take: 5000,
      where: { counselorId: counselor.id, active: true },
      select: { memberId: true },
    });
    return assignments.map((a) => a.memberId);
  }

  if (options?.isAdmin) {
    return resolveAdminEnrolledMemberIds(counselorUserId, adminCap);
  }

  return [];
}

function bucketFor(row: TriageRow): PriorityBucket {
  if (row.primaryPriority === 'red') return 'critical';
  if (row.primaryPriority === 'yellow') return 'warning';
  // blue (milestone) rows aren't actionable triage — render them as on-track.
  return 'ontrack';
}

function blockerReasonFor(row: TriageRow): string {
  // Prefer the most-actionable single label so the row reads at a glance.
  // The full flag list is available in `flags` for tooltip/secondary display.
  return FLAG_LABELS[row.primaryFlag] ?? 'Needs attention';
}

/**
 * Build the priority queue for the signed-in counselor.
 *
 * @param counselorUserId — signed-in user (must be a counselor or admin)
 * @param options.isAdmin — admin without a counselor record falls back to the
 *   org's enrolled members (matches `getTriageQueue` behaviour).
 */
export async function getCounselorPriorityQueue(
  counselorUserId: string,
  options?: { isAdmin?: boolean; adminMemberCap?: number },
): Promise<PriorityQueueData> {
  const triage = await getTriageQueue(counselorUserId, options);
  const now = new Date();

  // Map triage rows → priority queue rows.
  const flaggedIds = new Set<string>();
  const rows: PriorityQueueRow[] = [];

  for (const tr of [...triage.red, ...triage.yellow, ...triage.blue]) {
    flaggedIds.add(tr.memberId);
    const bucket = bucketFor(tr);
    const daysSinceLogin = tr.context.daysInactive ?? null;
    const hoursWaitingReply = tr.context.hoursWaiting ?? null;
    const lastContactAt =
      tr.context.staleSince ??
      (tr.context.milestoneAt ?? null) ??
      (daysSinceLogin != null
        ? new Date(now.getTime() - daysSinceLogin * DAY_MS)
        : null);

    rows.push({
      memberId: tr.memberId,
      memberName: tr.memberName,
      memberEmail: tr.memberEmail,
      enrolledProgram: tr.enrolledProgram,
      bucket,
      daysSinceLogin,
      hoursWaitingReply,
      blockerReason: blockerReasonFor(tr),
      lastContactAt,
      flags: [tr.primaryFlag, ...tr.additionalFlags],
      threadId: tr.context.threadId ?? null,
    });
  }

  // On-track: enrolled members the counselor is responsible for, not already
  // flagged. Keep this query cheap — just the roster, then exclude flagged IDs.
  let onTrackRows: PriorityQueueRow[] = [];
  const memberIds = await resolvePriorityQueueMemberIds(counselorUserId, options);

  if (memberIds.length > 0) {
    const members = await prisma.user.findMany({
      take: 5000,
      where: {
        id: { in: memberIds },
        deletedAt: null,
        enrolledProgram: { not: null },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        enrolledProgram: true,
        lastLoginAt: true,
      },
    });

    for (const member of members) {
      if (flaggedIds.has(member.id)) continue;
      const daysSinceLogin = member.lastLoginAt
        ? Math.floor((now.getTime() - member.lastLoginAt.getTime()) / DAY_MS)
        : null;
      onTrackRows.push({
        memberId: member.id,
        memberName: member.fullName ?? member.email,
        memberEmail: member.email,
        enrolledProgram: member.enrolledProgram,
        bucket: 'ontrack',
        daysSinceLogin,
        hoursWaitingReply: null,
        blockerReason: 'On track',
        lastContactAt: member.lastLoginAt ?? null,
        flags: [],
        threadId: null,
      });
    }
  }

  // Cap the on-track display so an admin viewing a large cohort doesn't
  // blow up the page; the bucket count below still reflects the true total.
  const onTrackTotal = onTrackRows.length;
  onTrackRows = onTrackRows.slice(0, 50);

  const all = [...rows, ...onTrackRows];

  return {
    rows: all,
    totals: {
      critical: rows.filter((r) => r.bucket === 'critical').length,
      warning: rows.filter((r) => r.bucket === 'warning').length,
      ontrack: onTrackTotal,
      total: rows.length + onTrackTotal,
    },
  };
}
