import { NextResponse } from 'next/server';

function isVercelCron(request: Request): boolean {
  const ua = request.headers.get('user-agent') ?? '';
  return ua.toLowerCase().includes('vercel');
}

/**
 * Authorize cron requests.
 *
 * Vercel's scheduled cron invocations do NOT automatically send CRON_SECRET.
 * They send GET requests with a User-Agent containing "vercel".
 *
 * Policy:
 *  - GET from Vercel user-agent  → allow (scheduled run)
 *  - GET/POST with valid secret  → allow (manual trigger from admin)
 *  - everything else              → 401
 */
export function authorizeCronRequest(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-cron-secret')?.trim();
  const providedSecret = headerToken || bearerToken;

  // Scheduled Vercel cron: allow without secret if user-agent says "vercel"
  if (request.method === 'GET' && isVercelCron(request)) {
    return null;
  }

  // Manual admin trigger: must provide secret
  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
