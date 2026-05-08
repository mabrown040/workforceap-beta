/**
 * Job rejected - employer notification email body HTML.
 *
 * Track E (Sprint E.1 PR 2) — support email and copy come from branding.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

export function jobRejectedHtml(params: {
  jobTitle: string;
  companyName: string;
  reason: string;
  branding?: OrganizationBranding;
}): string {
  const { jobTitle, companyName, reason, branding } = params;
  const supportEmail = escapeHtml(branding?.supportEmail ?? 'info@workforceap.org');
  return `
    <p>Your job posting has been reviewed but could not be approved at this time.</p>
    <p><strong>Job:</strong> ${escapeHtml(jobTitle)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p><strong>Reason:</strong></p>
    <p>${escapeHtml(reason)}</p>
    <p>You can edit the job in your employer portal and resubmit for review, or contact us at <a href="mailto:${supportEmail}">${supportEmail}</a> if you have questions.</p>
  `.trim();
}
