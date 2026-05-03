import { NextResponse } from 'next/server';

export function authorizeCronRequest(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers.get('x-cron-secret')?.trim();
  const providedSecret = headerToken || bearerToken;

  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
