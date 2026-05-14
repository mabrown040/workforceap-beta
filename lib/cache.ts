import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (redisUrl && redisToken) {
    redis = new Redis({ url: redisUrl, token: redisToken });
  }
  return redis;
}

/** Cache key prefix to avoid collisions with rate-limit keys. */
const CACHE_PREFIX = 'cache:';

function prefixed(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * Get a cached value by key.
 * Returns null on miss or when Redis is not configured.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  try {
    const value = await client.get(prefixed(key));
    if (value === null || value === undefined) return null;
    // Upstash Redis auto-deserializes JSON strings back to objects;
    // if we stored via setCache the value is already parsed.
    return value as T;
  } catch (err) {
    console.warn('[cache] get failed:', err);
    return null;
  }
}

/**
 * Set a cached value with a TTL in seconds.
 * No-op when Redis is not configured.
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.set(prefixed(key), value, { ex: ttlSeconds });
  } catch (err) {
    console.warn('[cache] set failed:', err);
  }
}

/**
 * Delete a single cache key.
 * No-op when Redis is not configured.
 */
export async function deleteCache(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    await client.del(prefixed(key));
  } catch (err) {
    console.warn('[cache] del failed:', err);
  }
}

/**
 * Get a cached value or fetch it via the provided function and cache the result.
 */
export async function getCacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const value = await fetcher();
  await setCache(key, value, ttlSeconds);
  return value;
}

/**
 * Invalidate cache keys matching a glob pattern (e.g. "programs:*").
 * Uses SCAN to avoid blocking Redis on large keyspaces.
 * No-op when Redis is not configured.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  try {
    const fullPattern = prefixed(pattern);
    let cursor = '0';
    const keysToDelete: string[] = [];

    do {
      const result = await client.scan(cursor, { match: fullPattern, count: 100 });
      cursor = result[0];
      const keys = result[1];
      if (keys && keys.length > 0) {
        keysToDelete.push(...keys);
      }
    } while (cursor !== '0');

    if (keysToDelete.length > 0) {
      // Upstash Redis supports DEL with multiple keys
      await client.del(...keysToDelete);
    }
  } catch (err) {
    console.warn('[cache] invalidate failed:', err);
  }
}
