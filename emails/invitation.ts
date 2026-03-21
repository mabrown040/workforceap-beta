/**
 * Invitation email body HTML.
 */

export function invitationHtml(params: {
  inviterName: string;
  role: string;
  personalMessage?: string | null;
}): string {
  const { inviterName, role, personalMessage } = params;
  const roleDesc =
    role === 'admin'
      ? 'Full admin panel access to manage members, programs, and settings.'
      : role === 'partner'
        ? 'Partner portal access with subgroup visibility.'
        : 'Student portal with training access.';
  return `
    <p>${inviterName} has invited you to join WorkforceAP.</p>
    <p><strong>Your role:</strong> ${role}</p>
    <p>${roleDesc}</p>
    ${personalMessage ? `<p><em>"${personalMessage}"</em></p>` : ''}
    <p>Click the button below to accept this invitation and complete your profile. This link expires in 7 days.</p>
  `.trim();
}
