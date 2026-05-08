/**
 * Invitation email body HTML.
 *
 * Track E (Sprint E.1 PR 2) — invitee sees the inviting org's name.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import type { OrganizationBranding } from '@/lib/tenant/organizationBranding';

export function invitationHtml(params: {
  inviterName: string;
  role: string;
  personalMessage?: string | null;
  branding?: OrganizationBranding;
}): string {
  const { inviterName, role, personalMessage, branding } = params;
  const orgName = escapeHtml(branding?.name ?? 'WorkforceAP');
  const roleDesc =
    role === 'admin'
      ? 'Full admin panel access to manage members, programs, and settings.'
      : role === 'partner'
        ? 'Partner portal access with subgroup visibility.'
        : 'Student portal with training access.';
  return `
    <p>${escapeHtml(inviterName)} has invited you to join ${orgName}.</p>
    <p><strong>Your role:</strong> ${escapeHtml(role)}</p>
    <p>${escapeHtml(roleDesc)}</p>
    ${personalMessage ? `<p><em>"${escapeHtml(personalMessage)}"</em></p>` : ''}
    <p>Click the button below to accept this invitation and complete your profile. This link expires in 7 days.</p>
  `.trim();
}
