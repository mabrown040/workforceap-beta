/** A saved program selection is separate from funded enrollment and course access. */
import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseEnrolledHtml(params: { firstName: string; programName: string }): string {
  const { firstName, programName } = params;
  return `
    <p>Hello ${escapeHtml(firstName)},</p>
    <p>Your program selection for <strong>${escapeHtml(programName)}</strong> has been saved.</p>
    <p>Check your program page for funding and enrollment next steps. Your enrollment notice will explain when you can begin classes.</p>
  `.trim();
}
