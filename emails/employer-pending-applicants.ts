/**
 * Weekly nudge to an employer: candidates have been waiting (pending/reviewing)
 * on one or more of their job posts for 5+ days.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function employerPendingApplicantsHtml(params: {
  candidateCount: number;
  jobsAffected: number;
  oldestWaitingDays: number;
}): string {
  const candidateCount = Math.max(0, Math.floor(Number(params.candidateCount) || 0));
  const jobsAffected = Math.max(0, Math.floor(Number(params.jobsAffected) || 0));
  const oldestWaitingDays = Math.max(0, Math.floor(Number(params.oldestWaitingDays) || 0));
  return `
    <p><strong>${escapeHtml(String(candidateCount))} candidate${candidateCount === 1 ? '' : 's'}</strong> ${candidateCount === 1 ? 'is' : 'are'} waiting on <strong>${escapeHtml(String(jobsAffected))} of your job post${jobsAffected === 1 ? '' : 's'}</strong>.</p>
    <p>The longest-waiting application has been sitting for <strong>${escapeHtml(String(oldestWaitingDays))} day${oldestWaitingDays === 1 ? '' : 's'}</strong>. Candidates are more likely to stay engaged — and accept an offer — when they hear back quickly.</p>
    <p>Review your applicants to move things forward.</p>
  `.trim();
}
