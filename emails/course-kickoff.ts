/** Program-assignment next steps; a CourseEnrollment row does not establish funded access. */
import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseKickoffHtml(params: { firstName: string; programName: string }): string {
  const { firstName, programName } = params;
  return `
    <p>Hello ${escapeHtml(firstName)},</p>
    <p>Your program selection for <strong>${escapeHtml(programName)}</strong> has been saved in your WorkforceAP account.</p>
    <p>Your counselor can help you review funding, enrollment approval, and course access. A saved program selection does not confirm that funding is secured or that classes are ready to begin.</p>
    <p>Open your program page to review your next steps. Your enrollment notice will explain when you can begin classes.</p>
  `.trim();
}
