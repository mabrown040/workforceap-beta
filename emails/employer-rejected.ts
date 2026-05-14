import { escapeHtml } from '@/lib/email/escapeHtml';

export function employerRejectedHtml(params: {
  companyName: string;
  contactName: string;
  reason?: string;
}): string {
  return `
<p>Hi ${escapeHtml(params.contactName)},</p>

<p>Thank you for your interest in WorkforceAP. After review, we are not able to approve your employer account for <strong>${escapeHtml(params.companyName)}</strong> at this time.</p>

${params.reason ? `<p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>` : ''}

<p>If you believe this was a mistake or have questions, please contact us at (512) 777-1808 or reply to this email.</p>

<p>— The WorkforceAP Team</p>
  `.trim();
}
