import type { BadgeVariant } from '@/components/portal/StatusBadge';
import type { AIJobMatchStatus } from '@prisma/client';

const LABELS: Record<string, string> = {
  suggested: 'Suggested',
  employer_notified: 'Notified',
  student_notified: 'Member notified',
  rejected: 'Declined',
  contacted: 'Contacted',
  interviewing: 'Interviewing',
  hired: 'Hired',
};

export function employerMatchPipelineLabel(status: AIJobMatchStatus | string): string {
  return LABELS[status] ?? status;
}

/** Semantic badge variant for AI match pipeline stages (aligned with StatusBadge). */
export function employerAiMatchStatusBadgeVariant(status: AIJobMatchStatus | string): BadgeVariant {
  switch (status) {
    case 'hired':
      return 'success';
    case 'rejected':
      return 'error';
    case 'interviewing':
      return 'info';
    case 'contacted':
    case 'employer_notified':
    case 'student_notified':
      return 'warning';
    case 'suggested':
    default:
      return 'accent';
  }
}
