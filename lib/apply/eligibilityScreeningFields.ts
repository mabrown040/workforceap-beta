/**
 * Shared shape + formatters for WS4 adult eligibility screening answers.
 * Used by confirmation emails, admin alerts, and CSV / datasheet exports.
 */

export type EligibilityScreeningFields = {
  receivingUnemployment?: string | null;
  exhaustedUnemployment?: string | null;
  layoffCompany?: string | null;
  snapWic?: string | null;
  hearAbout?: string | null;
  hearAboutOther?: string | null;
  partnerAmbassadorReferral?: string | null;
  /** Q1: currently unemployed. */
  q1?: string | null;
  /** Q2: household income at/below FPL for reported household size. */
  q2?: string | null;
  q3?: string | null;
  qualifies?: boolean | null;
  yesCount?: number | null;
  underemployed?: string | null;
  householdSize?: number | string | null;
  povertyGuideline?: string | null;
  employmentFit?: string | null;
  ageGroup?: string | null;
  zip?: string | null;
  city?: string | null;
  state?: string | null;
  county?: string | null;
  workforceCenter?: string | null;
};

/** CSV / table column headers for the eligibility datasheet. */
export const ELIGIBILITY_DATASHEET_COLUMNS = [
  'Receiving Unemployment',
  'Exhausted Unemployment',
  'Layoff Company',
  'SNAP/WIC',
  'Heard About Us',
  'Heard About Us (Other)',
  'Partner/Ambassador Referral',
  'Eligibility Q1',
  'Eligibility Q2',
  'Eligibility Q3',
  'Eligibility Qualifies',
  'Eligibility Yes Count',
  'Underemployed',
  'Household Size',
  'Employment Fit',
  'Age Group',
  'ZIP',
  'Workforce Center',
] as const;

export type EligibilityDatasheetColumn = (typeof ELIGIBILITY_DATASHEET_COLUMNS)[number];

export function hasEligibilityScreeningFields(
  fields: EligibilityScreeningFields | null | undefined,
): boolean {
  if (!fields) return false;
  return Boolean(
    fields.receivingUnemployment ||
      fields.exhaustedUnemployment ||
      fields.layoffCompany ||
      fields.snapWic ||
      fields.hearAbout ||
      fields.hearAboutOther ||
      fields.partnerAmbassadorReferral ||
      fields.q1 ||
      fields.q2 ||
      fields.q3 ||
      fields.underemployed ||
      fields.householdSize ||
      fields.povertyGuideline ||
      fields.employmentFit ||
      fields.ageGroup ||
      fields.zip ||
      fields.workforceCenter ||
      typeof fields.qualifies === 'boolean' ||
      typeof fields.yesCount === 'number',
  );
}

/** Ordered cell values matching {@link ELIGIBILITY_DATASHEET_COLUMNS}. */
export function eligibilityDatasheetCells(
  fields: EligibilityScreeningFields | null | undefined,
): string[] {
  const f = fields ?? {};
  return [
    f.receivingUnemployment ?? '',
    f.exhaustedUnemployment ?? '',
    f.layoffCompany ?? '',
    f.snapWic ?? '',
    f.hearAbout ?? '',
    f.hearAboutOther ?? '',
    f.partnerAmbassadorReferral ?? '',
    f.q1 ?? '',
    f.q2 ?? '',
    f.q3 ?? '',
    typeof f.qualifies === 'boolean' ? (f.qualifies ? 'yes' : 'no') : '',
    typeof f.yesCount === 'number' ? String(f.yesCount) : '',
    f.underemployed ?? '',
    f.householdSize != null && f.householdSize !== '' ? String(f.householdSize) : '',
    f.employmentFit ?? '',
    f.ageGroup ?? '',
    f.zip ?? '',
    f.workforceCenter ?? '',
  ];
}

function fitPlainLabel(fields: EligibilityScreeningFields): string {
  if (fields.employmentFit === 'case_by_case') return 'case by case';
  if (fields.employmentFit === 'qualify' || fields.qualifies === true) return 'yes';
  if (typeof fields.qualifies === 'boolean') return 'review';
  return fields.employmentFit ?? 'review';
}

/** Plain-text lines for Application.notes / admin email notes blocks. */
export function eligibilityFieldsPlainLines(fields: EligibilityScreeningFields): string[] {
  const lines: string[] = [];
  if (typeof fields.qualifies === 'boolean' || fields.employmentFit) {
    lines.push(
      `Quick eligibility fit: ${fitPlainLabel(fields)} (${fields.yesCount ?? 0} auto-qualify yeses)`,
    );
  }
  if (fields.ageGroup) lines.push(`Age group: ${fields.ageGroup}`);
  if (fields.city) lines.push(`City: ${fields.city}`);
  if (fields.state) lines.push(`State: ${fields.state}`);
  if (fields.zip) lines.push(`ZIP: ${fields.zip}`);
  if (fields.county) lines.push(`County: ${fields.county}`);
  if (fields.workforceCenter) lines.push(`Workforce / one-stop center: ${fields.workforceCenter}`);
  if (fields.q1) lines.push(`1. Unemployed: ${fields.q1}`);
  if (fields.receivingUnemployment) {
    lines.push(`2. Receiving unemployment (case-by-case if this is the only yes): ${fields.receivingUnemployment}`);
  }
  if (fields.exhaustedUnemployment) {
    lines.push(`3. Unemployment benefits exhausted: ${fields.exhaustedUnemployment}`);
  }
  if (fields.underemployed) lines.push(`4. Part-time / underemployed: ${fields.underemployed}`);
  if (fields.householdSize != null && fields.householdSize !== '') {
    lines.push(`Household size: ${fields.householdSize}`);
  }
  if (fields.povertyGuideline) lines.push(`Poverty guideline shown: ${fields.povertyGuideline}`);
  if (fields.q2) {
    lines.push(`Household income at or below poverty guideline: ${fields.q2}`);
  }
  if (fields.q3) lines.push(`Work authorization: ${fields.q3}`);
  if (fields.layoffCompany) lines.push(`Layoff / last employer: ${fields.layoffCompany}`);
  if (fields.snapWic) {
    lines.push(`TANF / WIC / Food stamps (SNAP): ${fields.snapWic}`);
  }
  if (fields.hearAbout) lines.push(`Heard about us: ${fields.hearAbout}`);
  if (fields.hearAboutOther) lines.push(`Heard about us (other): ${fields.hearAboutOther}`);
  if (fields.partnerAmbassadorReferral) {
    lines.push(`Partner/ambassador referral: ${fields.partnerAmbassadorReferral}`);
  }
  return lines;
}
