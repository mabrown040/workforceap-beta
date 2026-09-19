export type EnrollmentSignal = 'not_approved' | 'approved_not_started' | 'active' | 'stalled' | 'activity_unknown' | 'completed';

export function hasRecentCourseraActivity(value: Date | string | null, now: Date): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= now.getTime()
    && timestamp >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
}

/** Approval, an enrollment receipt, and observed learning are independent facts. */
export function deriveEnrollmentSignal(input: {
  approved: boolean;
  completed: boolean;
  observedActivity: boolean;
  lastActivityAt: Date | null;
  now: Date;
}): EnrollmentSignal {
  if (input.completed) return 'completed';
  if (!input.observedActivity) return input.approved ? 'approved_not_started' : 'not_approved';
  if (!input.lastActivityAt || !Number.isFinite(input.lastActivityAt.getTime())
    || input.lastActivityAt.getTime() > input.now.getTime()) return 'activity_unknown';
  return hasRecentCourseraActivity(input.lastActivityAt, input.now)
    ? 'active'
    : 'stalled';
}
