import { escapeHtml } from '@/lib/email/escapeHtml';

export function employerVerifyEmailHtml(params: {
  contactName: string;
  verifyUrl: string;
}): string {
  return `
<p>Hi ${escapeHtml(params.contactName)},</p>

<p>Thanks for creating a <strong>WorkforceAP</strong> employer account. One quick step before you can log in: confirm this email address.</p>

<p><a href="${escapeHtml(params.verifyUrl)}">Verify your email address</a></p>

<p>If you didn&rsquo;t create this account, you can ignore this email — the account cannot be used until the email is verified.</p>

<p>If you have questions, reply to this email or call us at (512) 777-1808.</p>

<p>— The WorkforceAP Team</p>
  `.trim();
}
