export const CENTRAL_TEXAS_REFERRAL_SOURCES = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
  'Texas Workforce Commission (TWC)',
  'Austin Area Urban League',
  'African American Youth Harvest Foundation',
  '211 Texas',
  'Community organization',
  'Church or faith community',
  'Flyer or brochure',
  'Friend or family',
  'Google / web search',
  'Social media',
  'WorkforceAP counselor or team member',
  'Other / write in',
] as const;

/** Used when the referral-sources API cannot reach the database. */
export const FALLBACK_REFERRAL_SOURCES = CENTRAL_TEXAS_REFERRAL_SOURCES;

/** Public/member intake options. Keep partner orgs separate from individual counselors. */
export const PUBLIC_REFERRAL_SOURCE_OPTIONS = CENTRAL_TEXAS_REFERRAL_SOURCES;

/** Admin create-member and wizard options (public list + legacy labels for older records). */
export const ADMIN_REFERRAL_SOURCE_OPTIONS = [
  ...CENTRAL_TEXAS_REFERRAL_SOURCES,
  'Workforce Solutions',
  'Community Organization',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Referral',
  'Community Event',
  'Social Media',
  'Church',
] as const;
