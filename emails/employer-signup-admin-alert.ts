import { escapeHtml } from '@/lib/email/escapeHtml';

export function employerSignupAdminAlertHtml(params: {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
}): string {
  return `
<p>A new employer has signed up and is awaiting approval.</p>
<ul>
  <li><strong>Company:</strong> ${escapeHtml(params.companyName)}</li>
  <li><strong>Contact:</strong> ${escapeHtml(params.contactName)}</li>
  <li><strong>Email:</strong> ${escapeHtml(params.contactEmail)}</li>
  ${params.contactPhone ? `<li><strong>Phone:</strong> ${escapeHtml(params.contactPhone)}</li>` : ''}
</ul>
<p>Review and approve them in the admin portal.</p>
  `.trim();
}
