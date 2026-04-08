import type { BadgeVariant } from '@/components/portal/StatusBadge';

const LABELS: Record<string, string> = {
  draft: 'Draft',
  pending: 'In review',
  approved: 'Approved',
  live: 'Live',
  filled: 'Filled',
  closed: 'Closed',
};

export function employerJobStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function employerJobStatusBadgeVariant(status: string): BadgeVariant {
  if (status === 'live') return 'success';
  if (status === 'filled') return 'info';
  if (status === 'pending') return 'warning';
  return 'neutral';
}
