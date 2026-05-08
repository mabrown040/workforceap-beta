import { redirect } from 'next/navigation';

/**
 * Locale-prefixed URL fallback. DO NOT DELETE.
 *
 * `next.config.ts` has `{ source: '/account', destination: '/dashboard/account' }`
 * which handles the unprefixed case. But `/es/account` (or any locale-prefixed
 * legacy URL) bypasses that rule because next.config redirects match against
 * the original request path. `middleware.ts` then strips the locale via an
 * INTERNAL rewrite to `/account`, and the resolver looks for a page file.
 *
 * Without this stub, `/es/account` and friends 404. With it, they end up
 * back on `/dashboard/account` (the middleware will re-add the locale on
 * the redirect target based on the user's cookie / Accept-Language).
 */
export default function AccountRedirectPage() {
  redirect('/dashboard/account');
}
