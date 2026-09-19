import { PORTAL_TIMEZONE } from '@/lib/formatDate';

const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Minutes to add to a UTC instant to get wall-clock time in `PORTAL_TIMEZONE`. */
function portalOffsetMinutes(instantMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTAL_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(instantMs / 1000) * 1000) / 60_000);
}

/**
 * Converts a `<input type="date">` value (`YYYY-MM-DD`) into the ISO instant
 * for the END of that calendar day in `PORTAL_TIMEZONE`.
 *
 * `new Date('2026-09-30').toISOString()` is UTC midnight at the START of the
 * day, so the public board (`expiresAt >= now`) hid the job the evening
 * before the chosen date for Central-time employers. The form hint promises
 * "hidden after this date", so the stored instant is 23:59:59.999 Central.
 *
 * Returns `null` for an empty or malformed value.
 */
export function jobExpiryInstant(dateStr: string | null | undefined): string | null {
  const m = DATE_INPUT_RE.exec((dateStr ?? '').trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const endOfDayAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), 23, 59, 59, 999);
  if (Number.isNaN(endOfDayAsUtc)) return null;
  // Two passes so a DST transition on the chosen day resolves to the right offset.
  const guess = endOfDayAsUtc - portalOffsetMinutes(endOfDayAsUtc) * 60_000;
  const instant = endOfDayAsUtc - portalOffsetMinutes(guess) * 60_000;
  return new Date(instant).toISOString();
}

/**
 * Inverse for the edit form: the `YYYY-MM-DD` (in `PORTAL_TIMEZONE`) that a
 * stored `expiresAt` instant belongs to. Splitting the raw ISO string would
 * read an end-of-day Central instant as the NEXT UTC day.
 */
export function jobExpiryDateInput(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
