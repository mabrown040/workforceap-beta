/**
 * Job approved - employer notification email body HTML.
 *
 * Track E (Sprint E.1 PR 2) — branded copy says "the {org name} job board"
 * instead of the hardcoded WorkforceAP wording.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

export function jobApprovedHtml(params: {
  jobTitle: string;
  companyName: string;
  branding?: OrganizationBranding;
}): string {
  const { jobTitle, companyName, branding } = params;
  const orgName = escapeHtml(branding?.name ?? 'WorkforceAP');
  return `
    <p>Great news! Your job posting has been approved and is now live on the ${orgName} job board.</p>
    <p><strong>Job:</strong> ${escapeHtml(jobTitle)}</p>
    <p><strong>Company:</strong> ${escapeHtml(companyName)}</p>
    <p>Students and graduates can now view and apply to this position. You'll receive email notifications when applicants apply.</p>
    <p>Log in to your employer portal to manage applications and view AI-suggested candidate matches.</p>
  `.trim();
}
