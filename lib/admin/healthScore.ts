/**
 * Student "health score" indicator for the admin members list.
 * Red/Yellow/Green based on login recency and activity levels.
 */

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface HealthScoreInput {
  lastEventAt: Date | null;
  recentEventCount: number; // events in last 30 days
  enrolledAt: Date | null;
}

export function calculateHealthStatus(input: HealthScoreInput): HealthStatus {
  const now = new Date();
  const daysSinceLastEvent = input.lastEventAt
    ? Math.floor((now.getTime() - input.lastEventAt.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;

  const hasActivity = input.recentEventCount > 0;

  // Red: no login in 14+ days AND no recent activity
  if (daysSinceLastEvent >= 14 && !hasActivity) return 'red';

  // Yellow: no login in 7-14 days OR declining activity (very low events)
  if (daysSinceLastEvent >= 7 || (input.enrolledAt && input.recentEventCount <= 1)) return 'yellow';

  // Green: active in last 7 days
  return 'green';
}

export function getHealthColor(status: HealthStatus): string {
  switch (status) {
    case 'green': return '#16a34a';
    case 'yellow': return '#d97706';
    case 'red': return '#dc2626';
  }
}

export function getHealthLabel(status: HealthStatus): string {
  switch (status) {
    case 'green': return 'Active';
    case 'yellow': return 'At Risk';
    case 'red': return 'Inactive';
  }
}
