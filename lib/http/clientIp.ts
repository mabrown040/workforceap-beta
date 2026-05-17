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
 *
 * We deliberately do NOT fall back to `x-forwarded-for`'s first segment —
 * that's the spoof-friendly value. If none of the trusted headers are set,
 * return 'unknown' so callers can decide how to handle missing client info.
 */
export function getClientIpFromRequest(request: Request): string {
  const vercelFwd = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercelFwd) return vercelFwd;

  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const cfIp = request.headers.get('cf-connecting-ip')?.trim();
  if (cfIp) return cfIp;

  return 'unknown';
}
