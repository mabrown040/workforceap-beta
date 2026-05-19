/**
 * Course kickoff email body HTML.
 *
 * Sent fire-and-forget right after a new `CourseEnrollment` row commits.
 * Short, actionable: anchor the member's first 30-minute calendar block this
 * week and reassure them the first 10 minutes are the easiest. Sprint R3
 * (PLAN-2026-Q3.md) ties this to lifting first-course completion 45% to 65%
 * within 30 days.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseKickoffHtml(params: { firstName: string; programName: string }): string {
  const { firstName, programName } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Your <strong>${escapeHtml(programName)}</strong> course starts soon. The single biggest predictor of finishing is blocking a 30-minute slot this week and showing up.</p>
    <p><strong>Do this today:</strong> open your calendar and put a 30-minute "${escapeHtml(programName)}" block on a specific day in the next 7 days.</p>
    <p>The first 10 minutes are the easiest — that's how 80% of members get started. Click the button below when your block hits and we'll drop you straight into lesson one.</p>
    <p>We're rooting for you.</p>
  `.trim();
}
