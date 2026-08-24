import { headers } from 'next/headers';
import type { HeadersLike } from '@/lib/tenant/resolveOrgFromRequest';

/**
 * Best-effort request headers for provision/heal paths that do not
 * receive a `NextRequest`. `headers()` throws outside a request
 * (unit tests, scripts) — treat that as "no host signal".
 */
export async function tryCurrentRequestHeaders(): Promise<HeadersLike | undefined> {
  try {
    return await headers();
  } catch {
    return undefined;
  }
}
