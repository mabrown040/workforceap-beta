import type { JobPostingApplicationStatus } from '@prisma/client';

const ALLOWED: Record<JobPostingApplicationStatus, JobPostingApplicationStatus[]> = {
  pending: ['reviewing', 'rejected'],
  reviewing: ['interview', 'pending', 'rejected'],
  interview: ['offered', 'reviewing', 'rejected'],
  offered: ['hired', 'interview', 'rejected'],
  hired: [],
  rejected: ['pending'],
};

export function canTransitionJobApplicationStatus(
  from: JobPostingApplicationStatus,
  to: JobPostingApplicationStatus
): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}
