/**
 * Sync status utilities for monitoring data freshness.
 */

export const SYNC_STALE_THRESHOLD_HOURS = 24;

/**
 * Determines whether the last sync timestamp is considered stale.
 * @param lastSyncAt - The Date of the last successful sync, or null if never synced.
 * @returns true if stale or never synced, false otherwise.
 */
export function isSyncStale(lastSyncAt: Date | null): boolean {
  if (!lastSyncAt) return true;
  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSyncAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= SYNC_STALE_THRESHOLD_HOURS;
}

/**
 * Returns a human-readable message describing the sync staleness state.
 * @param lastSyncAt - The Date of the last successful sync, or null if never synced.
 * @returns A string message suitable for alerts or dashboards.
 */
export function staleSyncMessage(lastSyncAt: Date | null): string {
  if (!lastSyncAt) {
    return `Sync has never completed (threshold: ${SYNC_STALE_THRESHOLD_HOURS}h).`;
  }
  const now = new Date();
  const hoursSinceSync = (now.getTime() - lastSyncAt.getTime()) / (1000 * 60 * 60);
  if (hoursSinceSync < SYNC_STALE_THRESHOLD_HOURS) {
    return `Sync is fresh (${Math.round(hoursSinceSync)}h ago, threshold: ${SYNC_STALE_THRESHOLD_HOURS}h).`;
  }
  return `Sync is stale (${Math.round(hoursSinceSync)}h ago, threshold: ${SYNC_STALE_THRESHOLD_HOURS}h).`;
}
