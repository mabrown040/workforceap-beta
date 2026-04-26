import type { BadgeVariant } from '@/components/portal/StatusBadge';
import type { JobPostingApplicationStatus } from '@prisma/client';

const LABELS: Record<JobPostingApplicationStatus, string> = {
  pending: 'Pending',
  reviewing: 'Reviewing',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Rejected',
};

/** Human-readable pipeline label for employer-facing UI (title case). */
export function employerJobPostingApplicationStatusLabel(
  status: JobPostingApplicationStatus | string,
): string {
  return LABELS[status as JobPostingApplicationStatus] ?? String(status);
}

/** Maps hiring pipeline stage to shared portal badge semantics. */
export function employerJobPostingApplicationStatusBadgeVariant(
  status: JobPostingApplicationStatus | string,
): BadgeVariant {
  switch (status) {
    case 'hired':
      return 'success';
    case 'rejected':
      return 'error';
    case 'offered':
    case 'interview':
      return 'info';
    case 'reviewing':
      return 'warning';
    case 'pending':
    default:
      return 'accent';
  }
}
