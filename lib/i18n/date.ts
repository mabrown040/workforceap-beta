/**
 * Locale-aware date formatting helper.
 *
 * `toLocaleDateString()` with no locale causes:
 * 1. SSR/CSR hydration mismatch (browser locale ≠ server locale)
 * 2. English dates for Spanish/French/Portuguese users
 *
 * Default to 'en-US' so server and client render identically.
 * In future: read from next-intl locale or user preference.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    return d.toLocaleDateString('en-US', {
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
