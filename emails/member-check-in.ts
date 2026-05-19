/**
 * Member check-in nudge — yellow tier, day 4.
 * Tone: friendly reminder that they were here last week.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function memberCheckInHtml(params: {
  firstName: string;
  dashboardUrl: string;
}): string {
  const { firstName, dashboardUrl } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>We saw you last week &mdash; keep going. A few days off is normal; momentum comes back quickly once you log a single course session or open one job lead.</p>
    <p>Your dashboard is ready when you are:</p>
    <p style="margin-top:1.25rem;">
      <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:0.7rem 1.1rem;background:#231f20;color:#fff;text-decoration:none;border-radius:6px;font-size:0.95rem;font-weight:600;">Open my dashboard</a>
    </p>
    <p style="margin-top:1rem;font-size:0.85rem;color:#584144;">Stuck on something? Reply to this email and your counselor will get back to you.</p>
  `.trim();
}

export const memberCheckInSubject = 'We saw you last week — keep going';
