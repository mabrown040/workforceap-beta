/**
 * Enrollment confirmation after admin approves a member application.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function enrollmentConfirmationHtml(params: {
  firstName: string;
  programName: string;
  counselorContact: string;
  counselorName?: string;
}): string {
  const { firstName, programName, counselorContact, counselorName } = params;
  const counselorLine = counselorName
    ? `<p><strong>${escapeHtml(counselorName)}</strong> is your counselor — they reply to messages within 2 business days. You can also reach them at <a href="mailto:${escapeHtml(counselorContact)}">${escapeHtml(counselorContact)}</a>.</p>`
    : `<p>A counselor will reach out within 2 business days. You can email them anytime at <a href="mailto:${escapeHtml(counselorContact)}">${escapeHtml(counselorContact)}</a>.</p>`;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Great news — you&rsquo;re in. Your WorkforceAP application has been approved. You&rsquo;re an <strong>accepted member</strong>, officially enrolled in <strong>${escapeHtml(programName)}</strong>, with full access to no-cost training for members.</p>
    <p><strong>What happens next:</strong></p>
    <ul>
      <li>Log in to your member portal to see your dashboard and program steps</li>
      <li>Complete your profile so your counselor can match opportunities to you</li>
      <li>Watch for a follow-up email with scheduling and onboarding details</li>
    </ul>
    ${counselorLine}
  `.trim();
}
