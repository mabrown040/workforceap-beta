/**
 * Weekly recap email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function weeklyRecapHtml(params: { firstName: string; recapSummary: string }): string {
  const { firstName, recapSummary } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Here's your WorkforceAP weekly recap:</p>
    <p>${escapeHtml(recapSummary)}</p>
    <p>View your full recap in the dashboard for detailed progress and recommended next actions.</p>
  `.trim();
}
