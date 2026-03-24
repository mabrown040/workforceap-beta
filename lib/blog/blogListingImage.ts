/** Public path when no DB image is set (neutral careers visual). */
export const BLOG_LISTING_FALLBACK_IMAGE = '/images/hero-people.jpg';

export function blogListingCardImage(heroImage: string | null | undefined, coverImage: string | null | undefined): string {
  const h = heroImage?.trim();
  if (h) return h;
  const c = coverImage?.trim();
  if (c) return c;
  return BLOG_LISTING_FALLBACK_IMAGE;
}
