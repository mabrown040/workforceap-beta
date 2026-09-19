import { PORTAL_TIMEZONE } from '@/lib/formatDate';

/**
 * Today's calendar date (`YYYY-MM-DD`) in `PORTAL_TIMEZONE`, for
 * `<input type="date">` `max` bounds and "not in the future" checks.
 *
 * `new Date().toISOString().slice(0, 10)` is the UTC date: a Central-time
 * member after 7 PM could pick tomorrow, and a member east of UTC had
 * today rejected as "in the future". Pin the day to the portal timezone so
 * both agree with the wall clock the member sees.
 */
export function todayInPortalTimezone(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PORTAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
