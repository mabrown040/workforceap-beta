import type { MentorSessionStatus } from '@prisma/client';

/**
 * Member-facing labels for the raw `MentorSessionStatus` enum. The mentor
 * dashboard used to print the enum value (`PENDING`, `CANCELLED`) verbatim.
 */
export const MENTOR_SESSION_STATUS_LABELS: Record<MentorSessionStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function mentorSessionStatusLabel(status: MentorSessionStatus | string): string {
  return MENTOR_SESSION_STATUS_LABELS[status as MentorSessionStatus] ?? status;
}
