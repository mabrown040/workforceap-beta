/**
 * Admin / Mike alert when an adult eligibility screening is submitted
 * (dashboard or tokenized questionnaire — not the new-application path).
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import { eligibilityScreeningSummaryHtml } from './eligibility-screening-summary';
import type { EligibilityScreeningFields } from '@/lib/apply/eligibilityScreeningFields';

export function eligibilityScreeningAdminAlertHtml(params: {
  memberName: string;
  memberEmail: string;
  memberId?: string | null;
  source: 'dashboard' | 'token' | 'apply';
  eligibility?: EligibilityScreeningFields | null;
}): string {
  const { memberName, memberEmail, memberId, source, eligibility } = params;
  const sourceLabel =
    source === 'dashboard'
      ? 'member portal (/dashboard/eligibility)'
      : source === 'token'
        ? 'public tokenized questionnaire (/q/…)'
        : 'apply signup';
  const summary = eligibilityScreeningSummaryHtml(eligibility);
  const memberLink = memberId
    ? `<p><a href="https://www.workforceap.org/admin/members/${encodeURIComponent(memberId)}">Open member in admin</a></p>`
    : '';
  return `
    <p>An adult eligibility screening was submitted.</p>
    <p><strong>Member:</strong> ${escapeHtml(memberName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(memberEmail)}</p>
    <p><strong>Source:</strong> ${escapeHtml(sourceLabel)}</p>
    ${summary}
    ${memberLink}
  `.trim();
}
