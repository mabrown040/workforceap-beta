/**
 * Member come-back nudge — red tier, day 7+.
 * Counselor-voiced; deep link to next-best action.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function memberComeBackHtml(params: {
  firstName: string;
  counselorName: string;
  nextBestActionUrl: string;
  nextBestActionLabel?: string;
}): string {
  const {
    firstName,
    counselorName,
    nextBestActionUrl,
    nextBestActionLabel = 'Take the next step',
  } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>${escapeHtml(counselorName)} has a question for you. It&rsquo;s been about a week since you logged in, and the team noticed.</p>
    <p>Nothing&rsquo;s wrong &mdash; we just want to make sure your training plan still fits your week. The fastest way to get back on track is to knock out the next step on your plan:</p>
    <p style="margin-top:1.25rem;">
      <a href="${escapeHtml(nextBestActionUrl)}" style="display:inline-block;padding:0.7rem 1.1rem;background:#231f20;color:#fff;text-decoration:none;border-radius:6px;font-size:0.95rem;font-weight:600;">${escapeHtml(nextBestActionLabel)}</a>
    </p>
    <p style="margin-top:1rem;">If something has changed (job, schedule, transportation, family), reply to this email and ${escapeHtml(counselorName)} will work it out with you.</p>
  `.trim();
}

export function memberComeBackSubject(counselorName: string): string {
  return `${counselorName} has a question for you`;
}
