import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/observability/logger';
import { withApiGuc } from '@/lib/db/withRequestGuc';

/**
 * GET /api/health/slo
 *
 * Admin-only SLO snapshot. Sprint P2 (observability uplift) replaced the
 * Sprint D.1 stub helpers with real measurements. Every metric either
 * returns a real value (computed from our own DB) or honestly reports
 * `current: null` / `status: 'unknown'` with a configuration note — we
 * still never emit synthetic numbers (see NOTE TO MAINTAINERS below).
 *
 * Auth: ADMIN-ONLY. Same posture as before: the data here (latencies,
 * error rates, isolation status) is operational and we don't want it
 * scraped. /api/health remains the public probe.
 *
 * Sources, post Sprint P2:
 *   - Latency p95s: Vercel Analytics REST API IFF `VERCEL_ANALYTICS_TOKEN`
 *     (and `VERCEL_PROJECT_ID` + `VERCEL_TEAM_ID` if applicable) are set.
 *     Otherwise the SLO is reported as `unknown` with a "not configured"
 *     note — we do not fabricate a number.
 *   - Error rate: `member_events` rows in the last 24h where eventName
 *     ends in `_failed` / `_error`, divided by total events in the window.
 *     This is a real number computed from our own DB; it is not perfectly
 *     correlated with HTTP 5xx (the next iteration will join /api/health
 *     and Sentry) but it is honest.
 *   - DB pool utilization: `pg_stat_activity` via `prisma.$queryRaw`,
 *     returning current backend count vs `max_connections`.
 *
 * NOTE TO MAINTAINERS: do not "fill in" any helper with synthetic numbers
 * to make a dashboard look populated. Either wire to a real source or keep
 * returning `current: null`. Synthetic SLO numbers shown to a funder or
 * buyer would be a trust violation.
 */

export const dynamic = 'force-dynamic';

type SloStatus = 'within' | 'breaching' | 'unknown';

type SloReport = {
  id: string;
  name: string;
  target: string;
  current: string | null;
  status: SloStatus;
  source: string;
  note?: string;
};

type SloEnvelope = {
  generatedAt: string;
  window: string;
  slos: SloReport[];
};

// ---------------------------------------------------------------------------
// Latency: Vercel Analytics REST API. Only attempts the fetch when the env
// is configured; otherwise returns a clear "not configured" status.
// ---------------------------------------------------------------------------

interface VercelAnalyticsConfig {
  token: string;
  projectId: string;
  teamId?: string;
}

function readVercelAnalyticsConfig(): VercelAnalyticsConfig | null {
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return {
    token,
    projectId,
    teamId: process.env.VERCEL_TEAM_ID,
  };
}

/**
 * Fetch a p95 latency in milliseconds for a given route from Vercel
 * Analytics. The Vercel REST shape varies by plan; we treat any non-2xx
 * response or unexpected shape as "unknown" and never throw to the caller.
 */
async function fetchVercelP95Ms(
  config: VercelAnalyticsConfig,
  route: string,
  windowDays: number,
): Promise<number | null> {
  const since = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const params = new URLSearchParams({
    projectId: config.projectId,
    since: String(since),
    until: String(Date.now()),
    filter: `route:${route}`,
    metric: 'p95',
  });
  if (config.teamId) params.set('teamId', config.teamId);
  const url = `https://api.vercel.com/v1/web-analytics/timing?${params.toString()}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { p95?: number; value?: number };
    if (typeof data.p95 === 'number') return data.p95;
    if (typeof data.value === 'number') return data.value;
    return null;
  } catch (err) {
    logger.warn('vercel analytics fetch failed', { err, route });
    return null;
  }
}

function evaluateLatencySlo(
  id: string,
  name: string,
  route: string,
  thresholdMs: number,
  ms: number | null,
  configured: boolean,
): SloReport {
  if (!configured) {
    return {
      id,
      name,
      target: `< ${thresholdMs} ms`,
      current: null,
      status: 'unknown',
      source: `Vercel Analytics — route:${route}, p95`,
      note: 'VERCEL_ANALYTICS_TOKEN / VERCEL_PROJECT_ID not set — measurement unavailable',
    };
  }
  if (ms == null) {
    return {
      id,
      name,
      target: `< ${thresholdMs} ms`,
      current: null,
      status: 'unknown',
      source: `Vercel Analytics — route:${route}, p95`,
      note: 'Vercel Analytics returned no usable value (insufficient traffic or API error)',
    };
  }
  return {
    id,
    name,
    target: `< ${thresholdMs} ms`,
    current: `${Math.round(ms)} ms`,
    status: ms < thresholdMs ? 'within' : 'breaching',
    source: `Vercel Analytics — route:${route}, p95`,
  };
}

// ---------------------------------------------------------------------------
// Error rate: MemberEvent rows in the last 24h.
// ---------------------------------------------------------------------------

async function measureMemberEventErrorRate(): Promise<SloReport> {
  const id = 'event_error_rate_24h';
  const name = 'Member event error rate (24h)';
  const target = '< 1%';
  const source = 'member_events table — count(eventName ~ "_failed|_error") / count(*) over 24h';
  try {
    const rows = await prisma.$queryRaw<
      Array<{ total: bigint | number; errors: bigint | number }>
    >`
      SELECT
        COUNT(*) FILTER (
          WHERE created_at > NOW() - INTERVAL '24 hours'
        ) AS total,
        COUNT(*) FILTER (
          WHERE created_at > NOW() - INTERVAL '24 hours'
            AND (event_name LIKE '%_failed' OR event_name LIKE '%_error')
        ) AS errors
      FROM member_events
    `;
    const row = rows[0];
    const total = Number(row?.total ?? 0);
    const errors = Number(row?.errors ?? 0);
    if (total === 0) {
      return {
        id,
        name,
        target,
        current: null,
        status: 'unknown',
        source,
        note: 'No member events recorded in the last 24h',
      };
    }
    const rate = errors / total;
    const pct = (rate * 100).toFixed(2);
    return {
      id,
      name,
      target,
      current: `${pct}%`,
      status: rate < 0.01 ? 'within' : 'breaching',
      source,
    };
  } catch (err) {
    logger.error('slo: member event error rate query failed', { err });
    return {
      id,
      name,
      target,
      current: null,
      status: 'unknown',
      source,
      note: 'Query failed — see server logs',
    };
  }
}

// ---------------------------------------------------------------------------
// DB pool utilization: pg_stat_activity vs max_connections.
// ---------------------------------------------------------------------------

async function measureDbPoolUtilization(): Promise<SloReport> {
  const id = 'db_pool_utilization';
  const name = 'Database connection pool utilization';
  const target = '< 80%';
  const source = 'pg_stat_activity / max_connections';
  try {
    const rows = await prisma.$queryRaw<
      Array<{ current: bigint | number; max_conn: bigint | number }>
    >`
      SELECT
        (SELECT COUNT(*) FROM pg_stat_activity)::bigint AS current,
        (current_setting('max_connections'))::bigint AS max_conn
    `;
    const row = rows[0];
    const current = Number(row?.current ?? 0);
    const max = Number(row?.max_conn ?? 0);
    if (max <= 0) {
      return {
        id,
        name,
        target,
        current: null,
        status: 'unknown',
        source,
        note: 'max_connections unavailable',
      };
    }
    const util = current / max;
    const pct = (util * 100).toFixed(1);
    return {
      id,
      name,
      target,
      current: `${current}/${max} (${pct}%)`,
      status: util < 0.8 ? 'within' : 'breaching',
      source,
    };
  } catch (err) {
    logger.error('slo: db pool utilization query failed', { err });
    return {
      id,
      name,
      target,
      current: null,
      status: 'unknown',
      source,
      note: 'Query failed — see server logs',
    };
  }
}

// ---------------------------------------------------------------------------
// Uptime, email delivery, cross-tenant isolation, Coursera ingestion all
// still depend on external sources we haven't wired yet. Keep them honest:
// unknown with a clear note.
// ---------------------------------------------------------------------------

function measureUptime(): SloReport {
  return {
    id: 'uptime',
    name: 'Overall uptime',
    target: '99.9%',
    current: null,
    status: 'unknown',
    source: 'External uptime monitor (Better Uptime) hitting /api/health (live) and /api/health/ready (Prisma/org)',
    note: 'External monitor not yet wired — measurement unavailable',
  };
}

function measureCrossTenantIsolation(): SloReport {
  return {
    id: 'cross_tenant_leaks',
    name: 'Cross-tenant isolation (binary)',
    target: '0 leaks',
    current: null,
    status: 'unknown',
    source: 'Synthetic monitor (Track A.3 deliverable); interim: CI isolation tests',
    note: 'Runtime synthetic probe not yet wired — interim assurance is CI isolation tests',
  };
}

function measureCourseraIngestion(): SloReport {
  return {
    id: 'coursera_xapi_ingestion',
    name: 'Coursera xAPI ingestion success',
    target: '99.5%',
    current: null,
    status: 'unknown',
    source: 'XapiIngestionLog table + Sentry exceptions on /api/coursera/xapi',
    note: 'XapiIngestionLog not yet aggregated here — measurement deferred',
  };
}

function measureEmailDelivery(): SloReport {
  return {
    id: 'email_delivered_5min',
    name: 'Email delivered within 5 min',
    target: '99% in 5 min',
    current: null,
    status: 'unknown',
    source: 'Email table + Resend delivery webhook',
    note: 'Resend delivery webhook backfill not yet wired — measurement unavailable',
  };
}

async function _GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const generatedAt = new Date().toISOString();
    const vercelConfig = readVercelAnalyticsConfig();

    const [dashboardMs, outcomesMs, errorRate, dbPool] = await Promise.all([
      vercelConfig ? fetchVercelP95Ms(vercelConfig, '/dashboard', 7) : Promise.resolve(null),
      vercelConfig ? fetchVercelP95Ms(vercelConfig, '/admin/outcomes', 7) : Promise.resolve(null),
      measureMemberEventErrorRate(),
      measureDbPoolUtilization(),
    ]);

    const slos: SloReport[] = [
      measureUptime(),
      evaluateLatencySlo(
        'dashboard_latency_p95',
        'Dashboard p95 latency',
        '/dashboard',
        500,
        dashboardMs,
        Boolean(vercelConfig),
      ),
      evaluateLatencySlo(
        'outcomes_latency_p95',
        '/admin/outcomes p95 latency',
        '/admin/outcomes',
        500,
        outcomesMs,
        Boolean(vercelConfig),
      ),
      measureEmailDelivery(),
      measureCrossTenantIsolation(),
      measureCourseraIngestion(),
      errorRate,
      dbPool,
    ];

    const body: SloEnvelope = {
      generatedAt,
      window: 'last 7 days (latency) / last 24h (errors) / live (db pool)',
      slos,
    };

    return NextResponse.json(body, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logger.error('/health/slo error', { err: error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const GET = withApiGuc(_GET);
