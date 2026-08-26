const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)+$/;
const VENDOR_TOKENS = new Set(['ibm', 'google', 'meta', 'aws', 'microsoft']);

export function looksLikeCourseraSlug(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes(' ') && SLUG_RE.test(trimmed);
}

/**
 * Coursera B4B / xAPI often store `course_name` as a slug
 * (`introduction-to-technical-support`). Prefer a catalog title when we have
 * one; otherwise title-case the slug so admin/member cards are readable.
 */
export function humanizeCourseraCourseTitle(
  name: string | null | undefined,
  fallbackSlug?: string | null,
): string {
  const primary = (name ?? '').trim();
  const fallback = (fallbackSlug ?? '').trim();
  const raw = primary || fallback;
  if (!raw) return 'Untitled course';
  if (primary && !looksLikeCourseraSlug(primary)) return primary;
  const source = looksLikeCourseraSlug(raw) ? raw : fallback;
  if (!source || !looksLikeCourseraSlug(source)) return raw;
  const words = source
    .split('-')
    .filter((part) => part && !VENDOR_TOKENS.has(part))
    .map((part) => {
      if (part === 'it') return 'IT';
      if (part === 'ai') return 'AI';
      return part.charAt(0).toUpperCase() + part.slice(1);
    });
  return words.join(' ') || raw;
}
