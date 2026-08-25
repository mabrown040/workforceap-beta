/**
 * Application confirmation email body HTML — sent to applicant after form submit.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import { eligibilityScreeningSummaryHtml } from './eligibility-screening-summary';
import type { EligibilityScreeningFields } from '@/lib/apply/eligibilityScreeningFields';

export function applicationConfirmationHtml(params: {
  firstName: string;
  /** WS4 adult eligibility answers when collected on apply. */
  eligibility?: EligibilityScreeningFields | null;
}): string {
  const { firstName, eligibility } = params;
  const eligibilityBlock = eligibilityScreeningSummaryHtml(eligibility, {
    heading: 'Eligibility answers we received',
  });
  return `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>This is your automatic receipt &mdash; we&rsquo;ve received your application to the Workforce Advancement Project and it is on file.</p>
    <p>Here is what happens next:</p>
    <ol>
      <li><strong>Advisor review</strong> &mdash; a real WorkforceAP staff member looks at your goals and program interest, usually within about 1&ndash;2 business days</li>
      <li><strong>A separate email with next steps</strong> &mdash; after review, an advisor emails you the next concrete step (this receipt is not that follow-up)</li>
      <li><strong>If accepted, you&rsquo;ll use your member portal</strong> &mdash; training, AI career tools, and your counselor all in one place</li>
    </ol>
    ${eligibilityBlock}
    <p><strong>What you can do while you wait:</strong></p>
    <ul>
      <li>Bookmark your portal login at <a href="https://www.workforceap.org/login">workforceap.org/login</a></li>
      <li>Watch your inbox and spam folder for the advisor follow-up from WorkforceAP</li>
      <li>Keep the same email and phone number available so our team can reach you</li>
    </ul>
    <p>Questions? Call <a href="tel:+15127771808">(512) 777-1808</a> or email <a href="mailto:info@workforceap.org">info@workforceap.org</a>.</p>
    <p>If you do not hear from an advisor after about 2 business days, call or email and we will check your application with you.</p>
  `.trim();
}
