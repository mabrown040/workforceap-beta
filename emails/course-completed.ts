/**
 * Course completion congratulations email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function courseCompletedHtml(params: { firstName: string; courseName: string }): string {
  const { firstName, courseName } = params;
  return `
    <p>Congratulations, ${escapeHtml(firstName)}!</p>
    <p>You've completed <strong>${escapeHtml(courseName)}</strong>. That's a great milestone!</p>
    <p>Keep up the momentum—check your dashboard to see your progress and what's next in your program.</p>
  `.trim();
}
