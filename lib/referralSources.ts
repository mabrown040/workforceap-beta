export const REFERRAL_SOURCE_OTHER_PARTNER = 'Other Partner (write in)';
export const REFERRAL_SOURCE_COMMUNITY_AMBASSADOR = 'Community Ambassador (write in)';

export const CENTRAL_TEXAS_REFERRAL_SOURCES = [
  'Launch Pad Job Club',
  'Purpose Works / Job Seekers Network',
  'Workforce Solutions Capital Area',
  'Workforce Solutions Rural Capital Area',
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
