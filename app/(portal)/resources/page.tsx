import { redirect } from 'next/navigation';

/**
 * Locale-prefixed URL fallback. DO NOT DELETE.
 *
 * See `app/(portal)/account/page.tsx` for the full reasoning. Tldr:
 * `next.config.ts` redirects don't fire for locale-prefixed URLs like
 * `/es/resources` — middleware rewrites them to `/resources` and the
 * resolver needs a page file at this path, otherwise the user gets a 404
 * instead of landing on `/dashboard/career-library`.
 */
export default function ResourcesRedirectPage() {
  redirect('/dashboard/career-library');
}
