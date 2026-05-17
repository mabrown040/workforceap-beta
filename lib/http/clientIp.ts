/**
 * Best-effort client IP from reverse-proxy headers.
 *
 * Security note: the first segment of `x-forwarded-for` is the value the
 * upstream client placed in the header — i.e. attacker-controlled. Trusting
 * it lets anyone bypass every IP-keyed rate limit by spoofing the header.
 *
 * Order of preference (trusted → least trusted):
 *  1. `x-vercel-forwarded-for` — set/overwritten by Vercel's edge with the
 *     real client IP as the first segment. Not user-settable.
 *  2. `x-real-ip` — set by Caddy / typical reverse proxies to the immediate
 *     peer's IP.
 *  3. `cf-connecting-ip` — set by Cloudflare when proxying.
 *  4. `x-forwarded-for` **last segment** — when a known proxy header is also
 *     present (Vercel/Caddy/Cloudflare), the last segment is the one the edge
 *     proxy appended, not the original client value. We still cap the chain
 *     length and reject obviously private/loopback IPs to avoid trusting a
 *     forged chain. Without a known-proxy signal we skip XFF entirely.
 *
 * If none of the trusted headers are set, return 'unknown' so callers can
 * decide how to handle missing client info.
 */
export function getClientIpFromRequest(request: Request): string {
  const vercelFwd = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelFwd) return vercelFwd;

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  // If none of the single-value trusted headers are present, look at
  // x-forwarded-for — but only when we have a known-proxy signal
  // (Vercel/Caddy/Cloudflare set at least one of the above headers, or
  // a proxy indicator header). Use the LAST segment (closest to the server,
  // appended by the edge proxy) rather than the first (client-controlled).
  const xff = request.headers.get('x-forwarded-for');
  const hasProxySignal =
    request.headers.has('x-vercel-forwarded-for') ||
    request.headers.has('x-vercel-id') ||
    request.headers.has('x-real-ip') ||
    request.headers.has('cf-connecting-ip') ||
    request.headers.has('x-caddy-client-ip');

  if (xff && hasProxySignal) {
    const segments = xff.split(',').map((s) => s.trim()).filter(Boolean);
    // Cap chain length to avoid trusting an absurdly forged chain.
    if (segments.length > 0 && segments.length <= 10) {
      const last = segments[segments.length - 1];
      // Reject obviously internal / loopback IPs — a forged chain shouldn't
      // end in private space because that would make the edge proxy useless.
      if (!isPrivateOrLoopbackIp(last)) {
        return last;
      }
    }
  }

  return 'unknown';
}

/** Basic private/loopback rejection for XFF last-segment sanity. */
function isPrivateOrLoopbackIp(ip: string): boolean {
  if (!ip) return true;
  // IPv4 loopback / private ranges
  if (ip === '127.0.0.1' || ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  // 172.16.0.0/12
  const parts = ip.split('.');
  if (parts.length === 4) {
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  // IPv6 loopback
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // IPv6 ULA
  return false;
}
