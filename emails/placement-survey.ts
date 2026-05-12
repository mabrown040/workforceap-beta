/**
 * Post-placement survey invite email body HTML.
 *
 * Sent ~30 days after a member's PlacementRecord.placedAt by the
 * placement-survey cron. The CTA in brandedEmailLayout deep-links to
 * /placement-survey?token=... where a signed token unlocks the form.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function placementSurveyHtml(params: {
  firstName: string;
  programName: string | null;
}): string {
  const { firstName, programName } = params;
  const programLine = programName
    ? `<p>You finished <strong>${escapeHtml(programName)}</strong> with us, and we'd love to hear how things are going on the job.</p>`
    : `<p>We'd love to hear how things are going on the job since you finished your program with us.</p>`;

  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    ${programLine}
    <p>The survey takes about 3 minutes. Your answers help us understand what's working, refine the program for the next cohort, and share real outcomes with the funders who make Workforce Funded Training possible.</p>
    <p style="margin-top:1rem;font-size:0.9rem;color:#584144;">If you'd rather not respond, you can ignore this email — we won't follow up again.</p>
  `.trim();
}
