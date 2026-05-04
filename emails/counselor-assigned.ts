import { escapeHtml } from '@/lib/email/escapeHtml';

export function counselorAssignedHtml(params: {
  firstName: string;
  counselorName: string;
  messagesUrl: string;
}): string {
  const first = escapeHtml(params.firstName);
  const name = escapeHtml(params.counselorName);
  const url = escapeHtml(params.messagesUrl);
  return `
    <p style="margin: 0 0 1rem; line-height: 1.6;">Hi ${first},</p>
    <p style="margin: 0 0 1rem; line-height: 1.6;">
      <strong>${name}</strong> has been assigned as your career counselor. You can message them anytime from your member portal — they reply within 2 business days, no email threads needed.
    </p>
    <p style="margin: 0; line-height: 1.6;">
      <a href="${url}" style="color: #C41E3A; font-weight: 600;">Open Messages</a>
    </p>
  `;
}
