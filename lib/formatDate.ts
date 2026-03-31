/**
 * Fixed locale + IANA timezone so server output matches client hydration
 * (avoids React #418 from default toLocale* varying by runtime default timezone).
 *
 * Uses Central Time (WorkforceAP / Texas operations). Node and browsers both resolve
 * `America/Chicago` identically for the same instant, so SSR and hydrate stay aligned.
 * Per-user timezones would need a profile field or client-only formatting.
 */
const PORTAL_LOCALE = 'en-US';
const PORTAL_TIMEZONE = 'America/Chicago';

const dateOpts: Intl.DateTimeFormatOptions = {
  timeZone: PORTAL_TIMEZONE,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
};

export function formatPortalDate(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(PORTAL_LOCALE, dateOpts);
}

export function formatPortalDateTime(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(PORTAL_LOCALE, {
    ...dateOpts,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}
