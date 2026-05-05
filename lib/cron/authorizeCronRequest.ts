import { NextResponse } from 'next/server';

type CronAuthOptions = {
  /**
   * Legacy compatibility for read-only/internal monitoring crons only.
   * Do NOT enable for routes that send email or mutate user state:
   * User-Agent is client-controlled and can be spoofed.
   */
  allowVercelUserAgent?: boolean;
};

function isVercelCron(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  return ua.toLowerCase().includes('vercel');
}

/**
 * Authorize cron requests.
 *
 * Default policy:
 *  - GET/POST with valid CRON_SECRET via Authorization Bearer or x-cron-secret → allow
 *  - everything else → 401
 *
 * `allowVercelUserAgent` exists only for legacy/read-only monitoring routes.
 * User-Agent is client-controlled and must not authorize email-sending or
 * state-mutating cron routes.
 */
export function authorizeCronRequest(
  request: Request,
  options: CronAuthOptions = {},
): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-cron-secret')?.trim();
  const providedSecret = headerToken || bearerToken;

  if (cronSecret && providedSecret === cronSecret) {
    return null;
  }

  if (options.allowVercelUserAgent && request.method === 'GET' && isVercelCron(request)) {
    return null;
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
