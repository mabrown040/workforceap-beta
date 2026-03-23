/**
 * Admin alert for pending applications over 3 days old.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function adminPendingApplicantsHtml(params: { pendingCount: number }): string {
  const pendingCount = Math.max(0, Math.floor(Number(params.pendingCount) || 0));
  return `
    <p>You have <strong>${escapeHtml(String(pendingCount))} pending application${pendingCount === 1 ? '' : 's'}</strong> that ${pendingCount === 1 ? 'is' : 'are'} more than 3 days old and still waiting for review.</p>
    <p>Applicants receive a follow-up email at the 3-day mark letting them know their application is being reviewed. Timely review helps keep applicants engaged.</p>
    <p>Click below to review pending applications in the admin dashboard.</p>
  `.trim();
}
