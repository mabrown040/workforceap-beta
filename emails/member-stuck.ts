/**
 * Member stuck nudge — red 14d+ OR stalled training.
 * Books 15 minutes with a counselor via the placeholder calendar link.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

const DEFAULT_CALENDAR_URL =
  process.env.COUNSELOR_BOOKING_URL ||
  'https://www.workforceap.org/counselor/book-15';

export function memberStuckHtml(params: {
  firstName: string;
  counselorName: string;
  calendarUrl?: string;
}): string {
  const {
    firstName,
    counselorName,
    calendarUrl = DEFAULT_CALENDAR_URL,
  } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Let&rsquo;s get unstuck. When training stalls for a couple of weeks, almost every time it&rsquo;s one specific blocker &mdash; tech, schedule, a confusing module, or just not knowing what&rsquo;s next.</p>
    <p>Book 15 minutes with ${escapeHtml(counselorName)}. We&rsquo;ll figure out the blocker and a real next step you can do this week:</p>
    <p style="margin-top:1.25rem;">
      <a href="${escapeHtml(calendarUrl)}" style="display:inline-block;padding:0.7rem 1.1rem;background:#231f20;color:#fff;text-decoration:none;border-radius:6px;font-size:0.95rem;font-weight:600;">Book 15 minutes</a>
    </p>
    <p style="margin-top:1rem;font-size:0.85rem;color:#584144;">If a call doesn&rsquo;t work, reply to this email with the best time and we&rsquo;ll coordinate.</p>
  `.trim();
}

export const memberStuckSubject = "Let's get unstuck — book 15 minutes";
