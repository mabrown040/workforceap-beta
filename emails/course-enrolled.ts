/**
 * Program enrollment confirmation email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseEnrolledHtml(params: { firstName: string; programName: string }): string {
  const { firstName, programName } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>You're now enrolled in <strong>${escapeHtml(programName)}</strong>.</p>
    <p>We're excited to support you on your learning journey. Head to your dashboard to access your program materials and start making progress.</p>
  `.trim();
}
