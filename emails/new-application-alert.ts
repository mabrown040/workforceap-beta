/**
 * New application admin alert email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function newApplicationAlertHtml(params: {
  applicantName: string;
  applicantEmail: string;
  programInterest: string;
  applicationId: string;
}): string {
  const { applicantName, applicantEmail, programInterest, applicationId } = params;
  return `
    <p>A new application has been submitted.</p>
    <p><strong>Applicant:</strong> ${escapeHtml(applicantName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(applicantEmail)}</p>
    <p><strong>Program interest:</strong> ${escapeHtml(programInterest)}</p>
    <p><strong>Application ID:</strong> ${escapeHtml(applicationId)}</p>
    <p>Please review the application in the admin panel.</p>
  `.trim();
}
