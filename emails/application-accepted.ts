/**
 * Application accepted email body HTML.
 *
 * Track E (Sprint E.1 PR 2) — accepts an optional `branding` so the org
 * name and support email are interpolated rather than hardcoded.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

export function applicationAcceptedHtml(params: {
  firstName: string;
  branding?: OrganizationBranding;
}): string {
  const { firstName, branding } = params;
  const orgName = escapeHtml(branding?.name ?? 'WorkforceAP');
  const supportEmail = escapeHtml(branding?.supportEmail ?? 'info@workforceap.org');
  return `
    <p>Congratulations, ${escapeHtml(firstName)}!</p>
    <p>Your application to ${orgName} has been accepted. We're excited to have you join our program.</p>
    <p><strong>Next steps:</strong></p>
    <ul>
      <li>Log in to your dashboard to access your program materials</li>
      <li>Complete your profile and assessment if you haven't already</li>
      <li>Select your program and start your training</li>
    </ul>
    <p>If you have any questions, reach out to your counselor or contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `.trim();
}
