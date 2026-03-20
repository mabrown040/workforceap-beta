/**
 * Invitation accepted notification email body HTML (to inviter).
 */

export function invitationAcceptedHtml(params: {
  accepterName: string;
  accepterEmail: string;
  role: string;
}): string {
  const { accepterName, accepterEmail, role } = params;
  return `
    <p><strong>${accepterName}</strong> (${accepterEmail}) has accepted your WorkforceAP invitation.</p>
    <p>They have been added as a <strong>${role}</strong>.</p>
    <p>You can view and manage them in the admin panel.</p>
  `.trim();
}
