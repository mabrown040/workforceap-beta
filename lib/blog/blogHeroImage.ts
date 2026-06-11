import { getDefaultImage } from '@/lib/blog/defaultImages';

const ALLOWED_REMOTE_HOSTS = [
  'images.unsplash.com',
  '.supabase.co',
  '.public.blob.vercel-storage.com',
];

function isAllowedRemoteHost(hostname: string) {
  return ALLOWED_REMOTE_HOSTS.some((entry) =>
    entry.startsWith('.') ? hostname.endsWith(entry) : hostname === entry,
  );
}

export function resolveBlogHeroImage(
  coverImage: string | null | undefined,
  category: string | null | undefined,
  slug: string | null | undefined,
) {
  const fallback = getDefaultImage(category, slug);
  const trimmed = coverImage?.trim();

  if (!trimmed) {
    return { src: fallback.url, alt: fallback.alt };
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return { src: trimmed, alt: `Cover image for ${slug ?? 'blog post'}` };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' && isAllowedRemoteHost(parsed.hostname)) {
      return { src: trimmed, alt: `Cover image for ${slug ?? 'blog post'}` };
    }
  } catch {
    // fall through to default image
  }

  return { src: fallback.url, alt: fallback.alt };
}
