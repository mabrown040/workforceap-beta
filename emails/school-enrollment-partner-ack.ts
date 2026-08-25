/**
 * Partner (school administrator) alert when a referred student completes apply signup.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function schoolEnrollmentPartnerAckHtml(params: {
  partnerName: string;
  studentName: string;
  studentEmail: string;
  programInterest: string;
  gradeLevel?: string | null;
  partnerPortalUrl: string;
}): string {
  const gradeLine = params.gradeLevel?.trim()
    ? `<li><strong>Grade:</strong> ${escapeHtml(params.gradeLevel.trim())}</li>`
    : '';
  return `
    <p>Hello,</p>
    <p>A new student from <strong>${escapeHtml(params.partnerName)}</strong> just completed a WorkforceAP enrollment application.</p>
    <ul>
      <li><strong>Student:</strong> ${escapeHtml(params.studentName)}</li>
      <li><strong>Email:</strong> ${escapeHtml(params.studentEmail)}</li>
      <li><strong>Program interest:</strong> ${escapeHtml(params.programInterest)}</li>
      ${gradeLine}
    </ul>
    <p>Our team will enroll the student into their chosen program within about 24&ndash;48 hours. You can track referred students and milestones in the partner portal.</p>
    <p><a href="${escapeHtml(params.partnerPortalUrl)}">Open partner portal</a></p>
    <p>Questions? Email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>
  `.trim();
}
