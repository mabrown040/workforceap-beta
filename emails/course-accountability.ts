/**
 * Day-5 accountability check-in for members who enrolled in a program but
 * still show zero Coursera progress. Sprint R3 (PLAN-2026-Q3.md) — paired
 * with a counselor follow-up audit event.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseAccountabilityHtml(params: {
  firstName: string;
  programName: string;
}): string {
  const { firstName, programName } = params;
  return `
    <p>Hey ${escapeHtml(firstName)},</p>
    <p>Your <strong>${escapeHtml(programName)}</strong> course is paid for and waiting — but our records show you haven't started yet.</p>
    <p>Let's get you over that first 10-minute hump. That's where 80% of members go from "thinking about it" to "I'm in this." We've reserved your seat; your counselor will reach out separately if you'd rather walk through it together.</p>
    <p>Tap below to open lesson one. No prep needed.</p>
  `.trim();
}
