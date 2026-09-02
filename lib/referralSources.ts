export const REFERRAL_SOURCE_OTHER_PARTNER = 'Other Partner (write in)';
export const REFERRAL_SOURCE_COMMUNITY_AMBASSADOR = 'Community Ambassador (write in)';

export const CENTRAL_TEXAS_REFERRAL_SOURCES = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  // Preserve the pre-existing generic choice alongside the two specific
  // boards. They are distinct answers, not display duplicates.
  'Workforce Solutions',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
  'Workforce Solutions Greater Dallas',
  'Workforce Solutions Central Texas',
  'Workforce Solutions Gulf Coast',
  'Workforce Solutions Alamo',
  'Goodwill Central Texas',
  'Gary Job Corps',
  'Lifeworks',
  'Building Promise',
  'LifeAnew',
  'MSRW Management',
  'ACC (Austin Community College)',
  'Community First (Mobile Loaves and Fishes)',
  'Big Austin',
  'EGBI',
  'YMCA',
  'Boys and Girls Clubs',
  'Capital Idea',
  'Austin Free-Net',
  'Latinitas',
  'Veterans Affairs (VA)',
  'City of Austin',
  'State of Texas',
  'Austin Public Health (APH)',
  'AISD',
  'Texas Empowerment Academy',
  '100 Black Men',
  REFERRAL_SOURCE_OTHER_PARTNER,
  REFERRAL_SOURCE_COMMUNITY_AMBASSADOR,
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

/** Historical admin values remain accepted so stale tabs and older records keep working. */
const LEGACY_ADMIN_REFERRAL_SOURCE_OPTIONS = [
  'Workforce Solutions',
  'Community Organization',
  'Flyer or Brochure',
  'WorkforceAP Counselor',
  'Referral',
  'Community Event',
  'Social Media',
  'Church',
] as const;

export const ADMIN_REFERRAL_SOURCE_ACCEPTED_VALUES = [
  ...CENTRAL_TEXAS_REFERRAL_SOURCES,
  ...LEGACY_ADMIN_REFERRAL_SOURCE_OPTIONS,
] as const;

const REFERRAL_SOURCE_SEMANTIC_ALIASES: Readonly<Record<string, string>> = {
  // Ops list spellings that mean the same organisation as an existing option.
  'launch pad job club (lpjc)': 'launch pad job club',
  lpjc: 'launch pad job club',
  'purposeworks / job seekers network': 'purpose works / job seekers network',
  purposeworks: 'purpose works / job seekers network',
  acc: 'acc (austin community college)',
  'austin community college': 'acc (austin community college)',
  'mobile loaves and fishes': 'community first (mobile loaves and fishes)',
  'community first': 'community first (mobile loaves and fishes)',
  'veterans affairs': 'veterans affairs (va)',
  va: 'veterans affairs (va)',
  'austin public health': 'austin public health (aph)',
  aph: 'austin public health (aph)',
  'community organization': 'community organization',
  'flyer or brochure': 'flyer or brochure',
  'social media': 'social media',
  'workforceap counselor': 'workforceap counselor or team member',
  church: 'church or faith community',
};

/** Case/whitespace-insensitive identity used only to remove duplicate menu rows. */
export function normalizedReferralSourceKey(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
  return REFERRAL_SOURCE_SEMANTIC_ALIASES[normalized] ?? normalized;
}

export function uniqueReferralSourceOptions(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizedReferralSourceKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Admin create-member menu: preserve every distinct historical choice while
 * collapsing only true semantic aliases and case/whitespace duplicates. */
export const ADMIN_REFERRAL_SOURCE_OPTIONS = uniqueReferralSourceOptions(
  [...CENTRAL_TEXAS_REFERRAL_SOURCES, ...LEGACY_ADMIN_REFERRAL_SOURCE_OPTIONS],
);
