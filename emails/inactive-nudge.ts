/**
 * Inactive member nudge email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function inactiveNudgeHtml(params: { firstName: string }): string {
  const { firstName } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>We miss you. Life gets busy, and we know workforce training has to fit around the rest of it &mdash; your job, your family, the unexpected stuff.</p>
    <p>Your spot in WorkforceAP is still here whenever you&rsquo;re ready. Log in to pick up where you left off, or message your counselor if something is in the way.</p>
    <p>If reaching out feels easier, email <a href="mailto:info@workforceap.org">info@workforceap.org</a> and we&rsquo;ll help you find a path forward.</p>
  `.trim();
}
