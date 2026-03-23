/**
 * Weekly referral outcomes digest for referral partners.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function partnerWeeklyDigestHtml(params: {
  partnerName: string;
  weekLabel: string;
  stageLines: string[];
  successLines: string[];
}): string {
  const stages = params.stageLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('');
  const successes =
    params.successLines.length > 0
      ? `<p><strong>This week:</strong></p><ul>${params.successLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
      : '<p><strong>This week:</strong> no new certifications or placements logged for your referrals.</p>';

  return `
    <p>Hi ${escapeHtml(params.partnerName)} team,</p>
    <p>Here is your weekly snapshot for ${escapeHtml(params.weekLabel)}.</p>
    <p><strong>Your referrals by stage:</strong></p>
    <ul>${stages}</ul>
    ${successes}
    <p>Log in to the partner portal anytime for full detail on each referred member.</p>
  `.trim();
}
