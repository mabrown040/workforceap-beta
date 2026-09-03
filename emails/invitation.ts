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
  /** Short XXXX-XXXX code that unlocks the same invitation at /invite (with the email). */
  loginCode?: string | null;
}): string {
  const { inviterName, role, personalMessage, branding, loginCode } = params;
  const orgName = escapeHtml(branding?.name ?? 'WorkforceAP');
  const normalizedRole = role.toLowerCase();
  const roleDesc =
    normalizedRole === 'admin'
      ? 'Full admin panel access to manage members, programs, and settings.'
      : normalizedRole === 'partner'
        ? 'Partner portal access with subgroup visibility.'
        : normalizedRole === 'counselor'
          ? 'Counselor portal: set up your counselor profile, see the members assigned to you, message them, and log session notes as you help them finish.'
          : 'Student portal with training access.';
  const invitePath = `${branding?.domain ?? 'https://www.workforceap.org'}/invite`;
  const loginCodeBlock = loginCode
    ? `
    <p style="margin:16px 0 4px;"><strong>Your login code:</strong></p>
    <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:22px;letter-spacing:0.12em;margin:0 0 8px;">${escapeHtml(loginCode)}</p>
    <p style="font-size:13px;color:#6b6b6b;">If the button does not work, go to <a href="${escapeHtml(invitePath)}">${escapeHtml(invitePath)}</a>, enter this email address and the code above.</p>`
    : '';
  return `
    <p>${escapeHtml(inviterName)} has invited you to join ${orgName}.</p>
    <p><strong>Your role:</strong> ${escapeHtml(role)}</p>
    <p>${escapeHtml(roleDesc)}</p>
    ${personalMessage ? `<p><em>"${escapeHtml(personalMessage)}"</em></p>` : ''}
    <p>Click the button below to accept this invitation and complete your profile. This link expires in 7 days.</p>${loginCodeBlock}
  `.trim();
}
