/**
 * Curated pool of diverse workforce / classroom hero backgrounds.
 * Picks a stable photo per route so pages feel varied without repeating one
 * frame sitewide. People-focused only: no city skylines (AdobeStock_78118914
 * was the Austin skyline hiding behind a stock filename), and at most one
 * frame per photoshoot (the wood-cabin session had three near-identical
 * frames that read as the same photo reused).
 */
export const MARKETING_HERO_PHOTO_POOL = [
  '/images/hero-people.webp',
  '/images/blog/1523240795612-9a054b0db644.jpg',
  '/images/blog/1522202176988-66273c2fd55f.jpg',
  '/images/blog/1531482615713-2afd69097998.jpg',
  '/images/blog/1552664730-d307ca884978.jpg',
  '/images/blog/1516321497487-e288fb19713f.jpg',
  '/images/blog/1531545514256-b1400bc00f31.jpg',
  '/images/blog/1581091226825-a6a2a5aee158.jpg',
  '/images/blog/1519389950473-47ba0277781c.jpg',
  '/images/blog/1560439514-4e9645039924.jpg',
] as const;

export type MarketingHeroPhotoPath = (typeof MARKETING_HERO_PHOTO_POOL)[number];

/** Homepage / OG default — first pool entry. */
export const DEFAULT_MARKETING_HERO_PHOTO: MarketingHeroPhotoPath = MARKETING_HERO_PHOTO_POOL[0];

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Pick a stable hero photo for a page path, slug, or other string key. */
export function heroPhotoForKey(key: string): MarketingHeroPhotoPath {
  const normalized = key.replace(/\/+$/, '') || '/';
  const index = hashKey(normalized) % MARKETING_HERO_PHOTO_POOL.length;
  return MARKETING_HERO_PHOTO_POOL[index]!;
}

/**
 * Pick `count` distinct photos for a page (hero, mid-band, closing CTA, ...)
 * so no section on a page reuses another section's photo. Strides through
 * the pool from the page's stable index; the first entry always matches
 * `heroPhotoForKey`, so existing hero picks stay stable.
 */
export function heroPhotoSequenceForKey(key: string, count: number): MarketingHeroPhotoPath[] {
  const len = MARKETING_HERO_PHOTO_POOL.length;
  const normalized = key.replace(/\/+$/, '') || '/';
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
