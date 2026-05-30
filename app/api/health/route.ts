import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { prisma } from '@/lib/db/prisma';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { publicApiCorsHeaders } from '@/lib/http/publicApiCors';
import { checkPublicHealthRateLimit } from '@/lib/rate-limit';

import { withApiGuc } from '@/lib/db/withRequestGuc';
import { healthCache } from './_healthCache';

const HEALTH_CORS = publicApiCorsHeaders('GET, HEAD, OPTIONS');

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 5000;

type CheckStatus = 'ok' | 'degraded' | 'skipped';

type CheckResult = {
  status: CheckStatus;
  responseTimeMs?: number;
};

type HealthChecks = {
  database: CheckResult;
  redis: CheckResult;
  s3: CheckResult;
};

async function checkDatabase(): Promise<CheckResult> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', responseTimeMs: Date.now() - started };
  } catch {
    return { status: 'degraded', responseTimeMs: Date.now() - started };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return { status: 'skipped' };
  }
  const started = Date.now();
  try {
    const client = new Redis({ url, token });
    const pong = await client.ping();
    if (pong === 'PONG') {
      return { status: 'ok', responseTimeMs: Date.now() - started };
    }
    return { status: 'degraded', responseTimeMs: Date.now() - started };
  } catch {
    return { status: 'degraded', responseTimeMs: Date.now() - started };
  }
}

async function checkS3(): Promise<CheckResult> {
  const endpoint = process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME || process.env.R2_BUCKET_NAME;
  if (!endpoint || !bucket) {
    return { status: 'skipped' };
  }
  const started = Date.now();
  try {
    // HEAD a well-known object path; 200/404/403 all mean the store is reachable.
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/${bucket}/health-check.txt`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok || res.status === 404 || res.status === 403) {
      return { status: 'ok', responseTimeMs: Date.now() - started };
    }
    return { status: 'degraded', responseTimeMs: Date.now() - started };
  } catch {
    return { status: 'degraded', responseTimeMs: Date.now() - started };
  }
}

function buildResponse(
  checks: HealthChecks,
  deep: boolean,
): {
  body: { status: string; version: string; timestamp: string; checks: HealthChecks };
  httpStatus: number;
} {
  const dbOk = checks.database.status === 'ok';
  const allOk = dbOk && checks.redis.status !== 'degraded' && checks.s3.status !== 'degraded';

  const overall = dbOk ? (allOk ? 'ok' : 'degraded') : 'fail';
  const httpStatus = dbOk ? 200 : 503;

  const checksOut: HealthChecks = deep
    ? checks
    : {
        database: { status: checks.database.status },
        redis: { status: checks.redis.status },
        s3: { status: checks.s3.status },
      };

  return {
    body: {
      status: overall,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      timestamp: new Date().toISOString(),
      checks: checksOut,
    },
    httpStatus,
  };
}

export async function OPTIONS() {
  try {
    return new NextResponse(null, { status: 204, headers: HEALTH_CORS });
  } catch (error) {
    console.error('/health OPTIONS:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiGuc(async (request: Request) => {
  try {
    const ip = getClientIpFromRequest(request);
    const { success: withinHealthLimit } = await checkPublicHealthRateLimit(ip);
    if (!withinHealthLimit) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { ...HEALTH_CORS, 'Cache-Control': 'no-store' } },
      );
    }

    const url = new URL(request.url);
    const deep = url.searchParams.get('deep') === 'true';

    // Serve cached response if still fresh.
    const cached = healthCache.current;
    if (cached && cached.until > Date.now()) {
      return NextResponse.json(cached.body, {
        status: cached.status,
        headers: cached.headers,
      });
    }

    const [database, redis, s3] = await Promise.all([checkDatabase(), checkRedis(), checkS3()]);
    const checks: HealthChecks = { database, redis, s3 };
    const { body, httpStatus } = buildResponse(checks, deep);

    const headers: Record<string, string> = {
      ...HEALTH_CORS,
      'Cache-Control': 'max-age=5',
    };

    healthCache.current = { body, status: httpStatus, headers, until: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(body, { status: httpStatus, headers });
  } catch (error) {
    console.error('/health GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
