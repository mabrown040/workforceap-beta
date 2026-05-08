/**
 * Counselor assigned email body HTML.
 *
 * Track E (Sprint E.1 PR 2) — accent link color follows the org primary
 * color so AAUL members do not see WorkforceAP maroon in their portal links.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import { DEFAULT_BRAND_ACCENT } from '@/lib/platform/brandColors';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

export function counselorAssignedHtml(params: {
  firstName: string;
  counselorName: string;
  messagesUrl: string;
  branding?: OrganizationBranding;
}): string {
  const first = escapeHtml(params.firstName);
  const name = escapeHtml(params.counselorName);
  const url = escapeHtml(params.messagesUrl);
  const accent = escapeHtml(params.branding?.primaryColor ?? DEFAULT_BRAND_ACCENT);
  return `
    <p style="margin: 0 0 1rem; line-height: 1.6;">Hi ${first},</p>
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      <strong>${name}</strong> has been assigned as your career counselor. You can message them anytime from your member portal — they reply within 2 business days, no email threads needed.
    </p>
    <p style="margin: 0; line-height: 1.6;">
      <a href="${url}" style="color: ${accent}; font-weight: 600;">Open Messages</a>
    </p>
  `;
}
