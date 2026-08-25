/**
 * Applicant confirmation after adult eligibility screening is submitted
 * (dashboard / tokenized questionnaire paths — apply signup uses application-confirmation).
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import { eligibilityScreeningSummaryHtml } from './eligibility-screening-summary';
import type { EligibilityScreeningFields } from '@/lib/apply/eligibilityScreeningFields';

export function eligibilityScreeningConfirmationHtml(params: {
  firstName: string;
  eligibility?: EligibilityScreeningFields | null;
}): string {
  const { firstName, eligibility } = params;
  const summary = eligibilityScreeningSummaryHtml(eligibility, {
    heading: 'Here is a copy of what you submitted',
  });
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thanks — we received your eligibility questionnaire. Our team will use these answers to keep your WorkforceAP membership file current.</p>
    ${summary}
    <p>You can update your answers any time from your member portal after logging in.</p>
    <p>Questions? Call <a href="tel:+15127771808">(512) 777-1808</a> or email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>
  `.trim();
}
