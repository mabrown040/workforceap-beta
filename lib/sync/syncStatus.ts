/**
 * Shared sync staleness threshold + helper.
 *
 * Centralized so the UI, API routes, and monitoring jobs all agree on
 * what "stale" means. Changing this value immediately shifts every banner,
 * alert, and SLO check.
 */

export const SYNC_STALE_THRESHOLD_HOURS = 24;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Returns true when `lastSyncAt` is null or older than
 * `SYNC_STALE_THRESHOLD_HOURS`.
 */
export function isSyncStale(lastSyncAt: Date | null | undefined): boolean {
  if (!lastSyncAt) return true;
  return Date.now() - lastSyncAt.getTime() > SYNC_STALE_THRESHOLD_HOURS * HOUR_MS;
}

/**
 * Human-readable stale label used by banners.
 */
export function staleSyncMessage(lastSyncAt: Date | null | undefined): string {
  if (!lastSyncAt) {
    return 'Training progress may be out of date. Last sync: unknown.';
  }
  const dateStr = lastSyncAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Training progress may be out of date. Last sync: ${dateStr}.`;
}
