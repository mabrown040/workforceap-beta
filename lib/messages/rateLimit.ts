/**
 * Simple in-memory rate limiter for message POSTs.
 * In production with multiple instances, swap to Redis.
 */

const store = new Map<string, { count: number; windowStart: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 10; // max 10 messages per minute per user

export function checkMessageRateLimit(userId: string): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(userId, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (entry.count >= MAX_PER_WINDOW) {
    const retryAfterMs = WINDOW_MS - (now - entry.windowStart);
    return { ok: false, retryAfterMs };
  }

  entry.count += 1;
  return { ok: true };
}

// Periodic cleanup (every 5 min) to avoid memory leaks
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now - entry.windowStart > WINDOW_MS * 2) {
        store.delete(key);
      }
    }
  }, 300_000);
}
