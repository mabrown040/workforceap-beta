import { redirect } from 'next/navigation';

/**
 * Locale-prefixed URL fallback. DO NOT DELETE.
 *
 * See `app/(portal)/account/page.tsx` for the full reasoning. Tldr:
 * `next.config.ts` redirects don't fire for locale-prefixed URLs like
 * `/es/help` — middleware rewrites them to `/help` and the resolver needs
 * a page file at this path, otherwise the user gets a 404 instead of
 * landing on `/dashboard/help`.
 */
export default function HelpRedirectPage() {
  redirect('/dashboard/help');
}
