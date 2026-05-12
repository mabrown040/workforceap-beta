/**
 * Post-placement survey invitation — body HTML for branded transactional email.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';

export function placementSurveyHtml(params: {
  firstName: string;
  programName: string;
}): string {
  const { firstName, programName } = params;
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Congratulations again on your placement${programName ? ` through <strong>${escapeHtml(programName)}</strong>` : ''}. You have been part of WorkforceAP for about a month, and we would love a few minutes of your feedback.</p>
    <p>Your answers help us support future cohorts and improve the program. The survey is short and works best when you complete it logged into your member dashboard.</p>
    <p>Thank you for taking the time to share how things are going.</p>
  `.trim();
}
