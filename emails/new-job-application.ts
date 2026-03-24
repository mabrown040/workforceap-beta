/**
 * New application to employer job - employer notification email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function newJobApplicationHtml(params: {
  jobTitle: string;
  applicantName: string;
  applicantEmail: string;
  applicationId: string;
}): string {
  const { jobTitle, applicantName, applicantEmail, applicationId } = params;
  return `
    <p>A new applicant has applied to your job posting.</p>
    <p><strong>Job:</strong> ${escapeHtml(jobTitle)}</p>
    <p><strong>Applicant:</strong> ${escapeHtml(applicantName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(applicantEmail)}</p>
    <p><strong>Application ID:</strong> ${escapeHtml(applicationId)}</p>
    <p>Log in to your employer portal to view the full application and resume.</p>
  `.trim();
}
