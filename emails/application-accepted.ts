/**
 * Application accepted email body HTML — first membership welcome when an
 * application is accepted. Uses the ops welcome letter as the canonical body.
 *
 * Track E (Sprint E.1 PR 2) — accepts an optional `branding` so the org
 * name and support email are interpolated rather than hardcoded.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import { memberWelcomeLetterHtml } from './member-welcome-letter';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

export function applicationAcceptedHtml(params: {
  firstName: string;
  branding?: OrganizationBranding;
}): string {
  const { firstName, branding } = params;
  const orgName = escapeHtml(branding?.name ?? 'WorkforceAP');
  const supportEmail = escapeHtml(branding?.supportEmail ?? 'info@workforceap.org');
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    ${memberWelcomeLetterHtml()}
    <p>If you have any questions about your ${orgName} membership, reach out to your counselor or contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>
  `.trim();
}
