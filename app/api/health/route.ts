import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getClientIpFromRequest } from '@/lib/http/clientIp';
import { publicApiCorsHeaders } from '@/lib/http/publicApiCors';
import { checkPublicHealthRateLimit } from '@/lib/rate-limit';

const HEALTH_CORS = publicApiCorsHeaders('GET, HEAD, OPTIONS');

/**
 * GET /api/health
 *
 * Public health endpoint. Reports the reachability and configuration status
 * of every external dependency the platform relies on. Designed for:
 *   - Partner / employer IT due diligence ("what's your uptime story?")
 *   - Internal monitoring (uptime checks can hit this)
 *   - Demo prep ("walk me through your operational story")
 *
 * Discipline:
 *   - Never returns secrets. Only reports presence (configured / not) and
 *     reachability (ok / fail / skipped).
 *   - Always returns 200 with a structured payload — uptime monitors should
 *     check the `status` field, not the HTTP status. This avoids the
 *     ambiguity of "the health check returned 500 because the health check
 *     itself crashed."
 *   - DB check uses a trivial `SELECT 1` so we don't load real rows on every
 *     hit and don't leak schema details if the response is observed.
 *   - Each dependency runs in parallel and is wrapped so one failure doesn't
 *     mask the others.
 */

export const dynamic = 'force-dynamic';

type DepStatus = 'ok' | 'fail' | 'not_configured' | 'skipped';

type DepReport = {
  name: string;
  status: DepStatus;
  /** Human-readable note. NEVER include secrets, tokens, or PII. */
  note?: string;
  /** Latency of the check in ms; only set when an actual call was made. */
  latencyMs?: number;
};

async function checkDatabase(): Promise<DepReport> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { name: 'database', status: 'ok', latencyMs: Date.now() - started };
  } catch {
    return {
      name: 'database',
      status: 'fail',
      latencyMs: Date.now() - started,
      note: 'database unreachable',
    };
  }
}

function checkSupabase(): DepReport {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return {
      name: 'supabase',
      status: 'not_configured',
      note: 'NEXT_PUBLIC_SUPABASE_URL or _ANON_KEY missing',
    };
  }
  // We deliberately do NOT make an outbound request here — Supabase health
  // is best read from Supabase's own dashboard, and pinging on every health
  // check would create a spam pattern. Configuration presence is the right
  // thing to surface here.
  return { name: 'supabase', status: 'ok', note: 'configured (config-only check)' };
}

function checkEmail(): DepReport {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      name: 'email_resend',
      status: 'not_configured',
      note: 'RESEND_API_KEY missing — outbound emails will be skipped',
    };
  }
  return { name: 'email_resend', status: 'ok', note: 'configured (config-only check)' };
}

function checkCourseraXapi(): DepReport {
  const endpoint = process.env.COURSERA_XAPI_ENDPOINT;
  const username = process.env.COURSERA_XAPI_USERNAME;
  const password = process.env.COURSERA_XAPI_PASSWORD;
  const ssoSecret = process.env.COURSERA_SSO_SECRET;
  const programId = process.env.COURSERA_DEFAULT_PROGRAM_ID;
  const missing: string[] = [];
  if (!endpoint) missing.push('COURSERA_XAPI_ENDPOINT');
  if (!username) missing.push('COURSERA_XAPI_USERNAME');
  if (!password) missing.push('COURSERA_XAPI_PASSWORD');
  if (!ssoSecret) missing.push('COURSERA_SSO_SECRET');
  if (!programId) missing.push('COURSERA_DEFAULT_PROGRAM_ID');
  if (missing.length > 0) {
    return {
      name: 'coursera_xapi',
      status: 'not_configured',
      note: `missing env: ${missing.join(', ')}`,
    };
  }
  return { name: 'coursera_xapi', status: 'ok', note: 'configured (config-only check)' };
}

function checkCaptcha(): DepReport {
  const enabled = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!enabled) {
    return {
      name: 'captcha_turnstile',
      status: 'skipped',
      note: 'NEXT_PUBLIC_CAPTCHA_ENABLED is not "true"; CAPTCHA bypassed for public forms',
    };
  }
  if (!siteKey || !secret) {
    return {
      name: 'captcha_turnstile',
      status: 'fail',
      note: 'CAPTCHA enabled but TURNSTILE_SITE_KEY or TURNSTILE_SECRET_KEY missing',
    };
  }
  return { name: 'captcha_turnstile', status: 'ok', note: 'configured + enabled' };
}

function checkSentry(): DepReport {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    return {
      name: 'sentry',
      status: 'not_configured',
      note: 'SENTRY_DSN missing — errors will not be reported externally',
    };
  }
  return { name: 'sentry', status: 'ok', note: 'configured (config-only check)' };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEALTH_CORS });
}

export async function GET(request: Request) {
  const ip = getClientIpFromRequest(request);
  const { success: withinHealthLimit } = await checkPublicHealthRateLimit(ip);
  if (!withinHealthLimit) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { ...HEALTH_CORS, 'Cache-Control': 'no-store' } },
    );
  }

  const startedAt = new Date();
  const [database, supabase, email, coursera, captcha, sentry] = await Promise.all([
    checkDatabase(),
    Promise.resolve(checkSupabase()),
    Promise.resolve(checkEmail()),
    Promise.resolve(checkCourseraXapi()),
    Promise.resolve(checkCaptcha()),
    Promise.resolve(checkSentry()),
  ]);

  const dependencies = [database, supabase, email, coursera, captcha, sentry];

  // Overall status:
  //   - "ok" if no dependency is in `fail`
  //   - "degraded" if a non-critical dep failed
  //   - "fail" if the database is down (the only single point of failure)
  let overall: 'ok' | 'degraded' | 'fail' = 'ok';
  if (database.status === 'fail') {
    overall = 'fail';
  } else if (dependencies.some((d) => d.status === 'fail')) {
    overall = 'degraded';
  }

  return NextResponse.json(
    {
      status: overall,
      generatedAt: startedAt.toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
      dependencies,
    },
    {
      status: 200,
      headers: { ...HEALTH_CORS, 'Cache-Control': 'no-store' },
    },
  );
}
