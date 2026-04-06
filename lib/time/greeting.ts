/**
 * Time-of-day greeting for dashboard copy (counselor, etc.).
 * Uses a US Central–friendly default; override with DEFAULT_GREETING_TZ.
 */
export function getTimeOfDayGreeting(
  date: Date = new Date(),
  timeZone = process.env.DEFAULT_GREETING_TZ ?? 'America/Chicago'
): 'Morning' | 'Afternoon' | 'Evening' {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const hourRaw = parts.find((p) => p.type === 'hour')?.value;
    const hour = hourRaw != null ? parseInt(hourRaw, 10) : date.getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  } catch {
    const h = date.getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }
}
