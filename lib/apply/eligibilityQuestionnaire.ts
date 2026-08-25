/**
 * Adult apply Step 1 questionnaire constants + soft-qualify helpers.
 * School/CHS collection skips these fields (see schoolCollection.ts).
 */

export type YesNo = 'yes' | 'no';

export const APPLY_PARTNER_REFERRAL_OPTIONS = [
  { value: 'launch_pad_job_club', label: 'Launch Pad Job Club' },
  { value: 'purpose_works_job_seekers_network', label: 'Purpose Works/Job Seekers Network' },
  {
    value: 'workforce_solutions_capital_area',
    label: 'Workforce Solutions Capital Area',
  },
  {
    value: 'workforce_solutions_rural_capital_area',
    label: 'Workforce Solutions Rural Capital Area',
  },
  { value: 'other_partner', label: 'Other Partner (write in)' },
  { value: 'community_ambassador', label: 'Community Ambassador (write in)' },
] as const;

export type ApplyPartnerReferralValue =
  (typeof APPLY_PARTNER_REFERRAL_OPTIONS)[number]['value'];

export const APPLY_HEAR_ABOUT_OTHER = 'Other / write in';

/** Structured snapshot stored on ApplyEligibilityScreening.answers */
export type ApplyEligibilityAnswersV1 = {
  version: 1;
  currentlyUnemployed: YesNo | null;
  receivingUnemployment: YesNo | null;
  unemploymentRanOut: YesNo | null;
  laidOffCompany: string;
  onSnapWicFoodStamps: YesNo | null;
  incomeBelow60k: YesNo | null;
  primaryBarriers: string[];
  hearAboutUs: string;
  hearAboutUsOther: string;
  partnerOrAmbassadorReferred: YesNo | null;
  partnerReferral: string;
  partnerReferralOther: string;
  ageGroup: string;
  city: string;
  state: string;
  zip: string;
  county: string;
};

export type SoftQualifyInputs = {
  currentlyUnemployed: YesNo | null;
  receivingUnemployment: YesNo | null;
  unemploymentRanOut: YesNo | null;
  onSnapWicFoodStamps: YesNo | null;
  incomeBelow60k: YesNo | null;
};

/** Soft funding-fit signal — never auto-denies. */
export function countSoftQualifyYes(inputs: SoftQualifyInputs): number {
  return [
    inputs.currentlyUnemployed,
    inputs.receivingUnemployment,
    inputs.unemploymentRanOut,
    inputs.onSnapWicFoodStamps,
    inputs.incomeBelow60k,
  ].filter((v) => v === 'yes').length;
}

export function softQualifies(inputs: SoftQualifyInputs): boolean {
  return countSoftQualifyYes(inputs) >= 1;
}

/** Require layoff company when any unemployment-related answer is yes. */
export function laidOffCompanyRequired(inputs: SoftQualifyInputs): boolean {
  return (
    inputs.currentlyUnemployed === 'yes' ||
    inputs.receivingUnemployment === 'yes' ||
    inputs.unemploymentRanOut === 'yes'
  );
}

export function partnerReferralNeedsWriteIn(value: string): boolean {
  return value === 'other_partner' || value === 'community_ambassador';
}

export function partnerReferralLabel(value: string): string {
  return APPLY_PARTNER_REFERRAL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function formatEligibilityAnswersForEmail(
  answers: ApplyEligibilityAnswersV1 | null | undefined,
  contact: { firstName?: string; lastName?: string; email?: string; phone?: string }
): string {
  if (!answers) return '';
  const yn = (v: YesNo | null) => (v === 'yes' ? 'Yes' : v === 'no' ? 'No' : '—');
  const hear =
    answers.hearAboutUs === APPLY_HEAR_ABOUT_OTHER || answers.hearAboutUsOther
      ? `${answers.hearAboutUs}${answers.hearAboutUsOther ? `: ${answers.hearAboutUsOther}` : ''}`
      : answers.hearAboutUs || '—';
  const partner =
    answers.partnerOrAmbassadorReferred === 'yes'
      ? `${partnerReferralLabel(answers.partnerReferral)}${
          answers.partnerReferralOther ? `: ${answers.partnerReferralOther}` : ''
        }`
      : yn(answers.partnerOrAmbassadorReferred);

  const lines = [
    contact.firstName || contact.lastName
      ? `Name: ${[contact.firstName, contact.lastName].filter(Boolean).join(' ')}`
      : null,
    contact.email ? `Email: ${contact.email}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
    `Age group: ${answers.ageGroup || '—'}`,
    `City: ${answers.city || '—'}`,
    `State: ${answers.state || '—'}`,
    `ZIP: ${answers.zip || '—'}`,
    `County: ${answers.county || '—'}`,
    `Currently unemployed: ${yn(answers.currentlyUnemployed)}`,
    `Receiving unemployment: ${yn(answers.receivingUnemployment)}`,
    `Unemployment ran out: ${yn(answers.unemploymentRanOut)}`,
    `Laid off from: ${answers.laidOffCompany || '—'}`,
    `SNAP/WIC/Food Stamps: ${yn(answers.onSnapWicFoodStamps)}`,
    `Household income below $60,000: ${yn(answers.incomeBelow60k)}`,
    `Primary barriers: ${(answers.primaryBarriers ?? []).join('; ') || '—'}`,
    `How did you hear about us: ${hear}`,
    `Partner/Community Ambassador referral: ${partner}`,
  ].filter(Boolean);

  return lines.join('\n');
}
