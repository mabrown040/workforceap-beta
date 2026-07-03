/**
 * Notifies an employer that one or more of their live job posts hit
 * expiresAt and were automatically closed by the job-expiry cron.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function employerJobExpiryHtml(params: { expiredCount: number }): string {
  const expiredCount = Math.max(0, Math.floor(Number(params.expiredCount) || 0));
  return `
    <p><strong>${escapeHtml(String(expiredCount))} of your job posting${expiredCount === 1 ? '' : 's'}</strong> reached its expiration date and ${expiredCount === 1 ? 'has' : 'have'} been automatically closed.</p>
    <p>Still hiring? Repost or extend the listing to keep it visible to candidates.</p>
  `.trim();
}
