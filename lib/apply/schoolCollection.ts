/**
 * High-school / sponsored-student apply collection.
 *
 * Adult apply asks employment, household income, county, and WIOA barriers
 * because those members are job-seekers. Concordia students are not employed
 * and are not applying for that funding path. This module is the contract for
 * what we collect instead.
 */

export const SCHOOL_STUDENT_BARRIER = 'high_school_student';

export const SCHOOL_AGE_GROUPS = [
  { value: 'under_18', label: 'Under 18' },
  { value: '18_24', label: '18–24' },
] as const;

export const SCHOOL_GRADE_LEVELS = [
  { value: '9', label: '9th grade' },
  { value: '10', label: '10th grade' },
  { value: '11', label: '11th grade' },
  { value: '12', label: '12th grade' },
  { value: 'other', label: 'Other / recent graduate' },
] as const;

export type SchoolCollectionFields = {
  ageGroup: string;
  gradeLevel: string;
  city: string;
  state: string;
  zipOk: boolean;
  parentGuardianName: string;
  parentGuardianEmail: string;
};

/** Implicit barrier written on signup so the adult checklist is never shown. */
export function schoolPrimaryBarriers(): string[] {
  return [SCHOOL_STUDENT_BARRIER];
}

export function schoolGuardianRequired(ageGroup: string): boolean {
  return ageGroup === 'under_18';
}

export function schoolDetailsComplete(
  fields: SchoolCollectionFields,
  emailLooksValid: (value: string) => boolean,
): boolean {
  if (!fields.ageGroup) return false;
  if (!fields.gradeLevel.trim()) return false;
  if (!fields.city.trim() || !fields.state.trim() || !fields.zipOk) return false;
  if (schoolGuardianRequired(fields.ageGroup)) {
    return fields.parentGuardianName.trim().length > 0 && emailLooksValid(fields.parentGuardianEmail.trim());
  }
  return true;
}

/** Fields the school flow must never require. */
export const SCHOOL_SKIPPED_ADULT_FIELDS = [
  'eligibilityQ1',
  'eligibilityQ2',
  'primaryBarriers',
  'county',
] as const;

export function isSchoolCollectionSignup(input: {
  partnerType?: string | null;
  gradeLevel?: string | null;
  primaryBarriers?: string[] | null;
  schoolApply?: boolean | null;
}): boolean {
  if (input.schoolApply) return true;
  if (input.partnerType === 'high_school') return true;
  if (input.primaryBarriers?.includes(SCHOOL_STUDENT_BARRIER)) return true;
  return Boolean(input.gradeLevel?.trim());
}

export function schoolProfileBarriers(): {
  barrierTypes: string[];
  hasEmploymentBarrier: false;
} {
  return { barrierTypes: schoolPrimaryBarriers(), hasEmploymentBarrier: false };
}

export function schoolApplicationNotes(fields: {
  ageGroup?: string | null;
  gradeLevel?: string | null;
  schoolName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  parentGuardianName?: string | null;
  parentGuardianEmail?: string | null;
}): string {
  return [
    'Collection: high-school student (no employment or income screening)',
    fields.schoolName?.trim() ? `School: ${fields.schoolName.trim()}` : null,
    fields.gradeLevel?.trim() ? `Grade: ${fields.gradeLevel.trim()}` : null,
    fields.ageGroup ? `Age group: ${fields.ageGroup}` : null,
    fields.city?.trim() ? `City: ${fields.city.trim()}` : null,
    fields.state?.trim() ? `State: ${fields.state.trim()}` : null,
    fields.zip?.trim() ? `ZIP: ${fields.zip.trim()}` : null,
    fields.parentGuardianName?.trim()
      ? `Guardian: ${fields.parentGuardianName.trim()}`
      : null,
    fields.parentGuardianEmail?.trim()
      ? `Guardian email: ${fields.parentGuardianEmail.trim()}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}
