/** Used when the referral-sources API cannot reach the database. */
export const FALLBACK_REFERRAL_SOURCES = [
  'Workforce Solutions',
  'Texas Workforce Commission (TWC)',
  'Austin Area Urban League',
  'African American Youth Harvest Foundation',
  '211 Texas',
  'Community Organization',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Other',
] as const;

/** Admin create-member and wizard options (subset + legacy labels). */
export const ADMIN_REFERRAL_SOURCE_OPTIONS = [
  ...FALLBACK_REFERRAL_SOURCES,
  'Referral',
  'Community Event',
  'Social Media',
  'Church',
] as const;
