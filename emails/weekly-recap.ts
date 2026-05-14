/**
 * Weekly recap email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

function recapSummaryToHtml(recapSummary: string): string {
  return escapeHtml(recapSummary).replace(/\n/g, '<br />\n');
}

export function weeklyRecapHtml(params: { firstName: string; recapSummary: string }): string {
  const { firstName, recapSummary } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Here's your WorkforceAP weekly recap:</p>
    <p style="white-space: normal; line-height: 1.5;">${recapSummaryToHtml(recapSummary)}</p>
    <p>Open the dashboard for the full recap, the job board, and your upcoming sessions.</p>
  `.trim();
}
