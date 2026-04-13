/** Best-effort client IP from reverse-proxy headers (Vercel, Caddy, etc.). */
export function getClientIpFromRequest(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
