/**
 * New application admin alert email body HTML.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import { eligibilityScreeningSummaryHtml } from './eligibility-screening-summary';
import type { EligibilityScreeningFields } from '@/lib/apply/eligibilityScreeningFields';

export function newApplicationAlertHtml(params: {
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  programInterest: string;
  applicationId: string;
  applicationNotes?: string;
  /** Structured WS4 fields (also may appear in applicationNotes). */
  eligibility?: EligibilityScreeningFields | null;
}): string {
  const {
    applicantName,
    applicantEmail,
    applicantPhone,
    programInterest,
    applicationId,
    applicationNotes,
    eligibility,
  } = params;
  const phoneLine = applicantPhone?.trim()
    ? `<p><strong>Phone:</strong> ${escapeHtml(applicantPhone.trim())}</p>`
    : '';
  const eligibilityBlock = eligibilityScreeningSummaryHtml(eligibility);
  const detailsBlock = applicationNotes?.trim()
    ? `<p><strong>Application details:</strong></p>
    <p>${escapeHtml(applicationNotes.trim()).replace(/\n/g, '<br>')}</p>`
    : '';
  return `
    <p>A new application has been submitted.</p>
    <p><strong>Applicant:</strong> ${escapeHtml(applicantName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(applicantEmail)}</p>
    ${phoneLine}
    <p><strong>Program interest:</strong> ${escapeHtml(programInterest)}</p>
    ${eligibilityBlock}
    ${detailsBlock}
    <p><strong>Application ID:</strong> ${escapeHtml(applicationId)}</p>
    <p>Please review the application in the admin panel.</p>
  `.trim();
}
