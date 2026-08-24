/**
 * QA / CI rate-limit bypass.
 *
 * When `WAP_RATE_LIMIT_QA_BYPASS=1` and the request carries
 * `x-wap-qa-bypass: $WAP_RATE_LIMIT_QA_SECRET`, fail-closed limiters
 * allow the request through. This is a test backdoor:
 *
 * - Hard-disabled when `VERCEL_ENV=production`, even if both env vars
 *   are set. A leaked CI secret must not disable auth rate limits in prod.
 * - Non-production only, and only when the secret is explicitly set
 *   (no default secret).
 */

export function isQaBypassEnabled(): boolean {
  if (process.env.VERCEL_ENV === 'production') return false;
  return process.env.WAP_RATE_LIMIT_QA_BYPASS?.trim() === '1';
}

export function isQaBypassRequest(request?: Request): boolean {
  if (!isQaBypassEnabled()) return false;
  if (!request) return false;
  const secret = process.env.WAP_RATE_LIMIT_QA_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get('x-wap-qa-bypass')?.trim();
  return Boolean(header) && header === secret;
}
