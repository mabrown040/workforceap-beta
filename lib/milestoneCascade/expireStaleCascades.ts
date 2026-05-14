import 'server-only';

import { prisma } from '@/lib/db/prisma';

/**
 * Flip `awaiting_approval` cascades whose 72h TTL has elapsed to `expired`.
 *
 * The TTL exists because stale celebrations are worse than no celebration.
 * If a counselor doesn't approve Drew's "you completed PMF" email within
 * 3 days, sending it later reads as out-of-touch.
 *
 * The status check (`status='awaiting_approval'`) in the WHERE clause means
 * approved / sent / dismissed cascades are never touched, even if their
 * expires_at is in the past.
 */

export const AUTO_EXPIRED_REASON_PREFIX = '[auto-expired:ttl] ';

export interface ExpireTickResult {
  expired: number;
}

export async function expireStaleCascades(opts?: {
  /** Override clock for tests. Defaults to `new Date()`. */
  now?: Date;
}): Promise<ExpireTickResult> {
  const cutoff = opts?.now ?? new Date();

  const updated = await prisma.milestoneCascade.updateMany({
    where: {
      status: 'awaiting_approval',
      expiresAt: { lt: cutoff },
    },
    data: {
      status: 'expired',
      dismissedAt: cutoff,
      dismissedReason: AUTO_EXPIRED_REASON_PREFIX + 'TTL elapsed without counselor action',
    },
  });

  return { expired: updated.count };
}
