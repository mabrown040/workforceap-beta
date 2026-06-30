/**
 * Locale-aware date formatting helper.
 *
 * `toLocaleDateString()` with no locale/timeZone causes:
 * 1. SSR/CSR hydration mismatch — the server (UTC) and the browser
 *    (the visitor's local zone) format the SAME instant differently,
 *    most visibly for timestamps near midnight, where they can land on
 *    different calendar days. React then sees server HTML ≠ client HTML
 *    and throws a hydration error (Sentry JAVASCRIPT-NEXTJS-1).
 * 2. English dates for Spanish/French/Portuguese users.
 *
 * Pin BOTH the locale ('en-US') AND the timeZone ('America/Chicago',
 * the org's operating zone) so server and client render byte-identical
 * output regardless of where the request is served or the page viewed.
 * In future: read from next-intl locale or user preference.
 */
const DISPLAY_TIME_ZONE = 'America/Chicago';

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: DISPLAY_TIME_ZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString('en-US', {
      timeZone: DISPLAY_TIME_ZONE,
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
