/**
 * Shared "when was this member last active" derivation for counselor surfaces
 * (`/counselor` command center + triage flags, `/counselor/students` roster).
 *
 * Only real `member_events` rows count as activity. Before this helper each
 * surface invented its own fallback when a member had no events — the
 * overview used `enrolledAt` (floored to the inactivity threshold, so a member
 * who joined this morning read "10+ days inactive · Urgent") while the roster
 * used `createdAt` (so the same member read "2h ago · On track"). Now both say
 * "No activity recorded" and neither derives urgency from a fallback.
 *
 * This is activity *recency* only. What counts as progress or completion is
 * defined elsewhere and is not affected.
 */

export const NO_ACTIVITY_RECORDED_LABEL = 'No activity recorded';

export type MemberLastActivity = {
  /** Timestamp of the most recent MemberEvent, or `null` when none exists. */
  lastActivityAt: Date | null;
  /** Whole days since `lastActivityAt`, or `null` when none exists. */
  daysInactive: number | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function resolveMemberLastActivity(
  lastEventAt: Date | null | undefined,
  now: Date = new Date(),
): MemberLastActivity {
  if (!lastEventAt) return { lastActivityAt: null, daysInactive: null };
  const elapsed = Math.max(0, now.getTime() - lastEventAt.getTime());
  return { lastActivityAt: lastEventAt, daysInactive: Math.floor(elapsed / DAY_MS) };
}

/** "No activity recorded" | "1 day inactive" | "N days inactive". */
export function describeInactivity(daysInactive: number | null): string {
  if (daysInactive == null) return NO_ACTIVITY_RECORDED_LABEL;
  return `${daysInactive} ${daysInactive === 1 ? 'day' : 'days'} inactive`;
}

/** Urgency needs a measured absence; an unknown recency is never urgent. */
export function isUrgentInactivity(daysInactive: number | null, thresholdDays: number): boolean {
  return daysInactive != null && daysInactive >= thresholdDays;
}
