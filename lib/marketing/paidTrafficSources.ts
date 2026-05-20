/** UTM sources treated as paid acquisition (matches /apply paid variant routing). */
export const PAID_UTM_SOURCES = ['google', 'google_ads', 'facebook_ads', 'tiktok_ads'] as const;

export type PaidUtmSource = (typeof PAID_UTM_SOURCES)[number];

const PAID_SET = new Set<string>(PAID_UTM_SOURCES);

export function isPaidUtmSource(source: string | null | undefined): boolean {
  if (!source) return false;
  return PAID_SET.has(source.trim().toLowerCase());
}

export function normalizeUtmSource(source: string | null | undefined): string {
  return (source ?? '').trim().toLowerCase();
}
