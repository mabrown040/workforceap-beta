/**
 * Curated pool of diverse workforce / classroom hero backgrounds.
 * Picks a stable photo per route so pages feel varied without repeating one
 * frame sitewide. People-focused only: no city skylines (AdobeStock_78118914
 * was the Austin skyline hiding behind a stock filename), and no frames from
 * the wood-cabin photoshoot (three near-identical frames of a homogeneous
 * group — stakeholder 2026-07-10: photos must show diversity, fun, and joy).
 */
export const MARKETING_HERO_PHOTO_POOL = [
  '/images/blog/1531545514256-b1400bc00f31.jpg',
  '/images/blog/1523240795612-9a054b0db644.jpg',
  '/images/blog/1522202176988-66273c2fd55f.jpg',
  '/images/blog/1531482615713-2afd69097998.jpg',
  '/images/blog/1552664730-d307ca884978.jpg',
  '/images/blog/1516321497487-e288fb19713f.jpg',
  '/images/blog/1581091226825-a6a2a5aee158.jpg',
  '/images/blog/1519389950473-47ba0277781c.jpg',
  '/images/blog/1560439514-4e9645039924.jpg',
] as const;

export type MarketingHeroPhotoPath = (typeof MARKETING_HERO_PHOTO_POOL)[number];

/** Homepage / OG default — first pool entry (diverse, joyful group at a laptop). */
export const DEFAULT_MARKETING_HERO_PHOTO: MarketingHeroPhotoPath = MARKETING_HERO_PHOTO_POOL[0];

/**
 * Hand-picked photo sets for pages the stakeholder reviews individually.
 * Homepage (2026-07-10 review): hero must be a diverse joyful group — not
 * the manufacturing lab; the closing CTA photo was called out as ideal and
 * must stay. Order = [hero, mid-band, closing CTA].
 */
const HERO_PHOTO_OVERRIDES: Record<string, readonly MarketingHeroPhotoPath[]> = {
  '/': [
    '/images/blog/1531545514256-b1400bc00f31.jpg',
    '/images/blog/1552664730-d307ca884978.jpg',
    '/images/blog/1531482615713-2afd69097998.jpg',
  ],
};

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function normalizeKey(key: string): string {
  return key.replace(/\/+$/, '') || '/';
}

/** Pick a stable hero photo for a page path, slug, or other string key. */
export function heroPhotoForKey(key: string): MarketingHeroPhotoPath {
  const normalized = normalizeKey(key);
  const override = HERO_PHOTO_OVERRIDES[normalized];
  if (override?.length) return override[0]!;
  const index = hashKey(normalized) % MARKETING_HERO_PHOTO_POOL.length;
  return MARKETING_HERO_PHOTO_POOL[index]!;
}

/**
 * Pick `count` distinct photos for a page (hero, mid-band, closing CTA, ...)
 * so no section on a page reuses another section's photo. Uses the page's
 * hand-picked override when one exists; otherwise strides through the pool
 * from the page's stable index. The first entry always matches
 * `heroPhotoForKey`, so hero picks stay stable.
 */
export function heroPhotoSequenceForKey(key: string, count: number): MarketingHeroPhotoPath[] {
  const normalized = normalizeKey(key);
  const override = HERO_PHOTO_OVERRIDES[normalized];
  if (override && override.length >= count) return override.slice(0, count);
  const len = MARKETING_HERO_PHOTO_POOL.length;
  const start = hashKey(normalized) % len;
  // stride must be coprime with the pool size so strided picks never collide
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  let stride = 3;
  while (gcd(stride, len) !== 1) stride++;
  return Array.from(
    { length: Math.min(count, len) },
    (_, i) => MARKETING_HERO_PHOTO_POOL[(start + i * stride) % len]!,
  );
}

export function heroPhotoCssUrl(key: string): string {
  return `url('${heroPhotoForKey(key)}')`;
}
