/**
 * Fixed locale + timezone so server-rendered text matches client hydration
 * (avoids React #418 from default toLocaleDateString / toLocaleString differences).
 */
const PORTAL_LOCALE = 'en-US';
const PORTAL_TIMEZONE = 'UTC';

export function formatPortalDate(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(PORTAL_LOCALE, {
    timeZone: PORTAL_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPortalDateTime(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(PORTAL_LOCALE, {
    timeZone: PORTAL_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
