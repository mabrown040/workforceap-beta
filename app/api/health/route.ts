import { NextResponse } from 'next/server';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { publicApiCorsHeaders } from '@/lib/http/publicApiCors';
import { checkPublicHealthRateLimit } from '@/lib/rate-limit';

const HEALTH_CORS = publicApiCorsHeaders('GET, HEAD, OPTIONS');

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — **liveness** only.
 *
 * Cheap process probe: no Prisma, Redis, or S3. A 200 here means the Next
 * isolate is up. It does **not** mean portal pages can render.
 *
 * The 2026-06-18 portal 504s stayed green here while `/dashboard` / `/admin`
 * timed out (`docs/POSTMORTEM-2026-06-18-PORTAL-OUTAGE.md`). For Prisma /
 * default-org reachability and 504-adjacent dependency alerts, probe
 * `GET /api/health/ready` (see `docs/HEALTH-PROBES.md`). Also alert on
 * Vercel runtime timeouts for `/dashboard`, `/admin`, `/counselor`.
 *
 * `?deep=true` is ignored. Dependency timing lives on `/api/health/ready`.
 */

function liveVersion(): string {
  // `||` (not `??`): an empty-string SHA must also fall back to 'local'.
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local';
}

export async function OPTIONS() {
  try {
    return new NextResponse(null, { status: 204, headers: HEALTH_CORS });
  } catch (error) {
    console.error('/health OPTIONS:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinHealthLimit } = await checkPublicHealthRateLimit(ip);
    if (!withinHealthLimit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { ...HEALTH_CORS, 'Cache-Control': 'no-store' } },
      );
    }

    const body = {
      status: 'ok' as const,
      probe: 'live' as const,
      version: liveVersion(),
      timestamp: new Date().toISOString(),
      note: 'Liveness only. Use GET /api/health/ready for Prisma/org readiness and 504-adjacent dependency alerts.',
    };

    return NextResponse.json(body, {
      status: 200,
      headers: {
        ...HEALTH_CORS,
        'Cache-Control': 'max-age=5',
      },
    });
  } catch (error) {
    console.error('/health GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
