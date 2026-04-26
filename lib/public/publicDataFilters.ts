/**
 * Hide obvious QA / test fixture labels from public-facing flows.
 * This keeps invite and referral surfaces honest even if DB cleanup lags.
 */

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function isExcludedPublicPartnerName(name: string | null | undefined): boolean {
  const n = normalize(name);
  if (!n) return false;
  return (
    n === 'test' ||
    n === 'test students' ||
    n.startsWith('test ') ||
    n.startsWith('qa ') ||
    n.includes(' qa ')
  );
}

export function isExcludedPublicSubgroupName(name: string | null | undefined): boolean {
  const n = normalize(name);
  if (!n) return false;
  return n === 'test subjects' || n.startsWith('test ') || n.startsWith('qa ');
}

export function sanitizePublicPartnerLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  return isExcludedPublicPartnerName(name) ? 'Community partner' : name;
}

export function sanitizePublicSubgroupLabel(name: string | null | undefined): string | null {
  if (!name) return null;
  return isExcludedPublicSubgroupName(name) ? 'Partner subgroup' : name;
}
