/**
 * Rate limiter for message POSTs (member/employer/partner counselor threads
 * and employer application messages).
 *
 * Backed by the shared Upstash-Redis limiter in lib/rate-limit.ts so the
 * limit is enforced globally across all serverless instances. A prior
 * in-memory `Map` implementation only capped requests per-instance, so on a
 * multi-instance deploy a user could send up to N-times-instances messages
 * per window before being throttled.
 */
import { checkMessageSendRateLimit } from '@/lib/rate-limit';

export async function checkMessageRateLimit(
  userId: string
): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const result = await checkMessageSendRateLimit(userId);
  if (result.success) {
    return { ok: true };
  }
  const retryAfterMs = result.resetMs ? Math.max(0, result.resetMs - Date.now()) : 60_000;
  return { ok: false, retryAfterMs };
}
