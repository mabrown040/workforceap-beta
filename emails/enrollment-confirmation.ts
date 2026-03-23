/**
 * Enrollment confirmation after admin approves a member application.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function enrollmentConfirmationHtml(params: {
  firstName: string;
  programName: string;
  counselorContact: string;
}): string {
  const { firstName, programName, counselorContact } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Great news — your WorkforceAP application has been approved. You are an <strong>accepted member</strong> and can move forward with no-cost training for members.</p>
    <p><strong>Program:</strong> ${escapeHtml(programName)}</p>
    <p><strong>Next steps:</strong></p>
    <ul>
      <li>Log in to your member portal to see your dashboard and milestones</li>
      <li>Complete your profile and any items your counselor requests</li>
      <li>Follow the email from our team for scheduling and onboarding details</li>
    </ul>
    <p><strong>Counselor contact:</strong> ${escapeHtml(counselorContact)}</p>
    <p>If you have questions, reply to your counselor or write us at info@workforceap.org.</p>
  `.trim();
}
