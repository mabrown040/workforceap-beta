/**
 * Job submitted for review - admin alert email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function jobSubmittedHtml(params: {
  jobTitle: string;
  companyName: string;
  employerEmail: string;
  jobId: string;
}): string {
  const { jobTitle, companyName, employerEmail, jobId } = params;
  return `
    <p>A new job posting has been submitted for review.</p>
    <p><strong>Job:</strong> ${escapeHtml(jobTitle)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Employer contact:</strong> ${escapeHtml(employerEmail)}</p>
    <p><strong>Job ID:</strong> ${escapeHtml(jobId)}</p>
    <p>Please review and approve or reject the job in the admin panel.</p>
  `.trim();
}
