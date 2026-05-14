import { escapeHtml } from '@/lib/email/escapeHtml';

export function employerApprovedHtml(params: {
  companyName: string;
  contactName: string;
}): string {
  return `
<p>Hi ${escapeHtml(params.contactName)},</p>

<p>Great news — your employer account for <strong>${escapeHtml(params.companyName)}</strong> has been approved.</p>

<p>You can now post jobs and they will go live after a quick review. You can also review applicants matched to your openings and track your hiring pipeline.</p>

<p>If you have questions, reply to this email or call us at (512) 777-1808.</p>

<p>— The WorkforceAP Team</p>
  `.trim();
}
