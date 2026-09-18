/**
 * HTML fragment listing WS4 adult eligibility screening answers.
 * Reused by applicant confirmation and admin alert emails.
 */

import { escapeHtml } from '@/lib/email/escapeHtml';
import {
  hasEligibilityScreeningFields,
  type EligibilityScreeningFields,
} from '@/lib/apply/eligibilityScreeningFields';

function row(label: string, value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  return `<li><strong>${escapeHtml(String(label))}:</strong> ${escapeHtml(String(value))}</li>`;
}

function fitLabel(fields: EligibilityScreeningFields): string | null {
  if (fields.employmentFit === 'case_by_case') {
    return `case by case (${fields.yesCount ?? 0} auto-qualify yeses)`;
  }
  if (typeof fields.qualifies === 'boolean') {
    return `${fields.qualifies ? 'yes' : 'review'} (${fields.yesCount ?? 0} auto-qualify yeses)`;
  }
  return fields.employmentFit ?? null;
}

/**
 * Returns an HTML block with the WS4 fields, or empty string when nothing to show.
 */
export function eligibilityScreeningSummaryHtml(
  fields: EligibilityScreeningFields | null | undefined,
  opts?: { heading?: string },
): string {
  if (!hasEligibilityScreeningFields(fields)) return '';
  const f = fields!;
  const heading = opts?.heading ?? 'Eligibility screening answers';
  const items = [
    row('Quick eligibility fit', fitLabel(f)),
    row('Age group', f.ageGroup),
    row('City', f.city),
    row('State', f.state),
    row('ZIP', f.zip),
    row('County', f.county),
    row('Workforce / one-stop center', f.workforceCenter),
    row('1. Unemployed', f.q1),
    row('2. Receiving unemployment', f.receivingUnemployment),
    row('3. Unemployment benefits exhausted', f.exhaustedUnemployment),
    row('4. Part-time / underemployed', f.underemployed),
    row('Household size', f.householdSize),
    row('Poverty guideline shown', f.povertyGuideline),
    row('Household income at or below poverty guideline', f.q2),
    row('Work authorization', f.q3),
    row('Layoff / last employer', f.layoffCompany),
    row('TANF / WIC / Food stamps (SNAP)', f.snapWic),
    row('Heard about us', f.hearAbout),
    row('Heard about us (other)', f.hearAboutOther),
    row('Partner / ambassador referral', f.partnerAmbassadorReferral),
  ]
    .filter(Boolean)
    .join('\n');
  if (!items) return '';
  return `
    <p><strong>${escapeHtml(heading)}</strong></p>
    <ul>
      ${items}
    </ul>
  `.trim();
}
