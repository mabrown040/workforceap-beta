/**
 * Process-local cache with a Redis-compatible API surface.
 *
 * This module is intentionally minimal — the same call sites
 * (getCacheOrFetch, invalidateCache) will work when a real Redis backend
 * is wired in later. For now it's an in-memory Map with TTL semantics:
 *   - get/set respects TTL (entries past their deadline are evicted lazily)
 *   - invalidate accepts an exact key OR a prefix-with-trailing-`*` pattern
 *   - the cache is per-process (one per Node worker / serverless instance),
 *     so reads of recently-written keys are NOT guaranteed to hit on the
 *     same connection — callers must already tolerate stale reads, which
 *     is consistent with the eventual Redis behavior under sharded reads.
 *
 * Why this exists: the routes added by this PR import getCacheOrFetch and
 * invalidateCache from `@/lib/cache` but the original implementation was
 * not committed. Without this stub the entire build fails with
 * "Cannot find module '@/lib/cache'". This file restores the build today
 * and gives the Redis upgrade a clean drop-in target.
 */

type Entry = { value: unknown; expiresAt: number };

const store = new Map<string, Entry>();

function isExpired(entry: Entry, now: number): boolean {
  return entry.expiresAt <= now;
}

/**
 * Return the cached value for `key`, or compute + cache it with `fetcher`
 * if absent / expired. The same call site is safe to use whether or not
 * the underlying cache backend exists — falling back to `fetcher()` when
 * the cache misses, errors, or is disabled.
 */
export async function getCacheOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && !isExpired(hit, now)) {
    return hit.value as T;
  }
  if (hit) store.delete(key); // lazy eviction

  let value: T;
  try {
    value = await fetcher();
  } catch (err) {
    // Never let a cache miss obscure a real fetch error.
    throw err;
  }

  store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
  return value;
}

/**
 * Drop one key OR every key matching a prefix (when the input ends with
 * `*`). Examples:
 *   await invalidateCache('member-state:abc-123');   // exact key
 *   await invalidateCache('member-state:abc-123*');  // prefix match
 */
export async function invalidateCache(keyOrPattern: string): Promise<void> {
  if (!keyOrPattern) return;
  if (keyOrPattern.endsWith('*')) {
    const prefix = keyOrPattern.slice(0, -1);
    for (const k of Array.from(store.keys())) {
      if (k.startsWith(prefix)) store.delete(k);
    }
    return;
  }
  store.delete(keyOrPattern);
}

/** Convenience for tests / dev tooling. */
export async function _clearAllCache(): Promise<void> {
  store.clear();
}
