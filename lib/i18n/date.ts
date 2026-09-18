import type { AppLocale } from '@/lib/i18n/config';
import { PORTAL_TIMEZONE } from '@/lib/formatDate';

/**
 * Locale-aware date formatting helper.
 *
 * `toLocaleDateString()` with no locale causes:
 * 1. SSR/CSR hydration mismatch (browser locale ≠ server locale)
 * 2. English dates for Spanish/French/Portuguese users
 *
 * Default to 'en-US' when no locale is supplied so server and client still
 * render identically for callers that haven't been updated yet. The timezone
 * is pinned to `PORTAL_TIMEZONE` (America/Chicago) for the same reason: the
 * server formats in UTC and a member's browser in local time, so an instant
 * near midnight otherwise lands on different calendar days and React reports
 * a hydration mismatch (#418). Callers that
 * know the active `AppLocale` (via `useLocale()` client-side or
 * `getRequestLocale()` server-side) should pass it through so members see
 * dates in their own language.
 */

/** Maps our internal `AppLocale` to the BCP-47 tag `Intl` expects. */
function toIntlLocale(locale?: AppLocale): string {
  switch (locale) {
    case 'es':
      return 'es-US';
    case 'fr':
      return 'fr-FR';
    case 'pt':
      return 'pt-BR';
    case 'en':
    default:
      return 'en-US';
  }
}

export function formatDate(date: Date | string | null | undefined, locale?: AppLocale): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString(toIntlLocale(locale), { timeZone: PORTAL_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateTime(date: Date | string | null | undefined, locale?: AppLocale): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString(toIntlLocale(locale), {
      timeZone: PORTAL_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Same as `formatDate` but with an explicit name for call sites that were
 * previously hardcoding `Intl.DateTimeFormat('en-US', ...)` inline. Prefer
 * this when formatting is one-off (not through the shared `formatDate`
 * signature above) and you want the locale requirement to be obvious at the
 * call site.
 */
export function formatLocalizedDate(
  date: Date | string | null | undefined,
  locale?: AppLocale,
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString(toIntlLocale(locale), { timeZone: PORTAL_TIMEZONE, ...options });
  } catch {
    return '—';
  }
}
