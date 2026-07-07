import { getDefaultImage } from '@/lib/blog/defaultImages';
import { heroPhotoForKey } from '@/lib/marketing/heroPhotos';

/** Public path when no DB image is set (legacy fallback). Prefer {@link blogListingCardImage}. */
export const BLOG_LISTING_FALLBACK_IMAGE = heroPhotoForKey('/blog');

/**
 * Card image URL for blog listing. Uses category+slug default pool (20+ curated Unsplash URLs) when no hero/cover.
 */
export function blogListingCardImage(
  heroImage: string | null | undefined,
  coverImage: string | null | undefined,
  category?: string | null,
  slug?: string | null,
): string {
  const h = heroImage?.trim();
  if (h) return h;
  const c = coverImage?.trim();
  if (c) return c;
  return getDefaultImage(category, slug).url;
}

/** Accessible alt when the card uses the category default image. */
export function blogListingCardAlt(post: {
  title: string;
  heroImage: string | null;
  coverImage: string | null;
  category: string | null;
  slug: string;
}): string {
  const h = post.heroImage?.trim();
  if (h) return post.title ? `Cover image for ${post.title}` : 'Blog post cover image';
  const c = post.coverImage?.trim();
  if (c) return post.title ? `Cover image for ${post.title}` : 'Blog post cover image';
  return getDefaultImage(post.category, post.slug).alt;
}
