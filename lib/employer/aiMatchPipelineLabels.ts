import type { AIJobMatchStatus } from '@prisma/client';

const LABELS: Record<string, string> = {
  suggested: 'Suggested',
  employer_notified: 'Notified',
  student_notified: 'Member notified',
  rejected: 'Passed',
  contacted: 'Contacted',
  interviewing: 'Interviewing',
  hired: 'Hired',
};

export function employerMatchPipelineLabel(status: AIJobMatchStatus | string): string {
  return LABELS[status] ?? status;
}
