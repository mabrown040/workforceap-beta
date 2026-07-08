/**
 * Curated pool of similar diverse workforce / classroom hero backgrounds.
 * Picks a stable photo per route so pages feel varied without repeating one
 * AdobeStock frame sitewide. Excludes city skylines (former austin-skyline).
 */
export const MARKETING_HERO_PHOTO_POOL = [
  '/images/AdobeStock_78118914.webp',
  '/images/hero-people.webp',
  '/images/blog/1523240795612-9a054b0db644.jpg',
  '/images/blog/1522202176988-66273c2fd55f.jpg',
  '/images/blog/1531482615713-2afd69097998.jpg',
  '/images/blog/1521737604893-d14cc237f11d.jpg',
  '/images/blog/1516321497487-e288fb19713f.jpg',
  '/images/blog/1531545514256-b1400bc00f31.jpg',
  '/images/blog/1521737711867-e3b97375f902.jpg',
  '/images/blog/1519389950473-47ba0277781c.jpg',
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

export function heroPhotoCssUrl(key: string): string {
  return `url('${heroPhotoForKey(key)}')`;
}

/** Themed backgrounds for marketing tiles (quick-start lanes, value deck, etc.). */
export const MARKETING_TILE_PHOTOS = {
  /** Beginner-friendly / digital literacy — diverse learners at laptops */
  digitalLiteracy: '/images/blog/1523240795612-9a054b0db644.jpg',
  /** IT support / in-demand tech — hands-on workshop */
  itSupport: '/images/blog/1516321497487-e288fb19713f.jpg',
  /** Employer-recognized credentials — classroom training */
  credentials: '/images/blog/1522202176988-66273c2fd55f.jpg',
  /** Career pathway / apply-to-hired journey */
  pathway: '/images/hero-people.webp',
} as const;
