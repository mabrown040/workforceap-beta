import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/server';
import { isAdmin } from '@/lib/auth/roles';

/**
 * GET /api/health/slo
 *
 * Internal SLO snapshot endpoint. Returns the current value, target, and
 * within/breaching status for each committed SLO over a rolling window.
 *
 * Auth: ADMIN-ONLY. Unlike /api/health (which is public and reports only
 * configuration presence + DB reachability), this endpoint surfaces
 * quantitative performance data — latency p95s, error rates, email
 * delivery percentages — that we don't want scraped into competitive
 * intelligence. The public-facing /status page (Sprint D.2) consumes a
 * curated, summarized view of this data, not the raw response.
 *
 * See docs/SLO-AND-STATUS.md for:
 *   - The committed SLO targets and rationale
 *   - Where each SLO is measured (Sentry / Vercel / DB / synthetic)
 *   - Burn-rate alert thresholds and incident response flow
 *   - The status-page recommendation
 *
 * Sprint D.1 status: response shape is final; underlying numbers are
 * STUBBED. Each measurement helper carries a TODO comment marking where
 * Sprint D.2 will wire in the real Sentry / Vercel / DB queries.
 */

export const dynamic = 'force-dynamic';

type SloStatus = 'within' | 'breaching' | 'unknown';

type SloReport = {
  /** Stable identifier — safe to use as a dashboard key. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Target string as documented in SLO-AND-STATUS.md (e.g. "99.9%", "< 500 ms"). */
  target: string;
  /** Current measured value, formatted for display. May be null if unknown. */
  current: string | null;
  /** Within target / breaching target / unknown (data not yet wired). */
  status: SloStatus;
  /** Where the SLI is computed. Helpful for an admin reading raw JSON. */
  source: string;
  /** Optional human note (e.g. "wiring deferred to Sprint D.2"). */
  note?: string;
};

type SloEnvelope = {
  generatedAt: string;
  window: string;
  slos: SloReport[];
};

/**
 * SLO #1 — Overall uptime.
 * Target: 99.9% over rolling 30 days, measured via /api/health probes.
 *
 * TODO: wire to real Sentry / Vercel APIs in Sprint D.2.
 *   - Pull last-30-day probe success ratio from Better Uptime API, OR
 *   - Aggregate from a self-hosted uptime log table.
 */
function measureUptime(): SloReport {
  return {
    id: 'uptime',
    name: 'Overall uptime',
    target: '99.9%',
    current: null,
    status: 'unknown',
    source: 'External uptime monitor (Better Uptime) hitting /api/health',
    note: 'Stub — wiring deferred to Sprint D.2',
  };
}

/**
 * SLO #2 — /dashboard p95 server render latency.
 * Target: p95 < 500 ms over rolling 7 days.
 *
 * TODO: wire to real Sentry / Vercel APIs in Sprint D.2.
 *   - Sentry Performance: filter transactions by `transaction:/dashboard`,
 *     query p95 over 7d window via the Discover API.
 */
function measureDashboardLatency(): SloReport {
  return {
    id: 'dashboard_latency_p95',
    name: 'Dashboard p95 latency',
    target: '< 500 ms',
    current: null,
    status: 'unknown',
    source: 'Sentry Performance — transaction:/dashboard, p95',
    note: 'Stub — wiring deferred to Sprint D.2',
  };
}

/**
 * SLO #3 — /admin/outcomes p95 server render latency.
 * Target: p95 < 500 ms over rolling 7 days.
 *
 * TODO: wire to real Sentry / Vercel APIs in Sprint D.2.
 *   - Sentry Performance: filter transactions by `transaction:/admin/outcomes`,
 *     query p95 over 7d window.
 */
function measureOutcomesLatency(): SloReport {
  return {
    id: 'outcomes_latency_p95',
    name: '/admin/outcomes p95 latency',
    target: '< 500 ms',
    current: null,
    status: 'unknown',
    source: 'Sentry Performance — transaction:/admin/outcomes, p95',
    note: 'Stub — wiring deferred to Sprint D.2',
  };
}

/**
 * SLO #4 — Email delivery within 5 minutes.
 * Target: 99% of Email rows show a Resend "delivered" event within 5 min
 * of `queuedAt` over rolling 7 days.
 *
 * TODO: wire to real Sentry / Vercel APIs in Sprint D.2.
 *   - Query: count(Email where deliveredAt is not null and (deliveredAt - queuedAt) <= 5min)
 *           / count(Email where queuedAt > now() - 7d)
 *   - Requires the Resend delivery webhook to be writing `deliveredAt` on Email rows.
 */
function measureEmailDelivery(): SloReport {
  return {
    id: 'email_delivered_5min',
    name: 'Email delivered within 5 min',
    target: '99% in 5 min',
    current: null,
    status: 'unknown',
    source: 'Email table + Resend delivery webhook',
    note: 'Stub — wiring deferred to Sprint D.2 (also gated on Resend webhook backfill)',
  };
}

/**
 * SLO #5 — Cross-tenant isolation. Binary SLO.
 * Target: 0 leaks from the synthetic check probing Org A endpoints with Org B credentials.
 *
 * TODO: wire to real Sentry / Vercel APIs in Sprint D.2.
 *   - Until Track A.3 ships the runtime synthetic probe, this is conditional.
 *   - For now, this reports "unknown" and points at the CI per-endpoint test as the
 *     interim assurance.
 */
function measureCrossTenantIsolation(): SloReport {
  return {
    id: 'cross_tenant_leaks',
    name: 'Cross-tenant isolation (binary)',
    target: '0 leaks',
    current: null,
    status: 'unknown',
    source: 'Synthetic monitor (Track A.3 deliverable); interim: CI isolation tests',
    note: 'Stub — depends on Track A.3 synthetic probe landing',
  };
}

/**
 * SLO #6 — Coursera xAPI ingestion success rate.
 * Target: 99.5% of inbound xAPI statements persist within 60 s over rolling 7 days.
 *
 * TODO: wire to real Sentry / Vercel APIs in Sprint D.2.
 *   - Query XapiIngestionLog for success/error counts in the last 7d.
 *   - Cross-check with Sentry exceptions thrown from the xAPI route.
 */
function measureCourseraIngestion(): SloReport {
  return {
    id: 'coursera_xapi_ingestion',
    name: 'Coursera xAPI ingestion success',
    target: '99.5%',
    current: null,
    status: 'unknown',
    source: 'XapiIngestionLog table + Sentry exceptions on /api/coursera/xapi',
    note: 'Stub — wiring deferred to Sprint D.2',
  };
}

export async function GET() {
  // Auth: admin-only. Mirrors the pattern used by every /api/admin/* route.
  // We deliberately do NOT mirror /api/health's public posture — see the
  // header comment and docs/SLO-AND-STATUS.md for the rationale.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isAdmin(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const generatedAt = new Date().toISOString();

  const slos: SloReport[] = [
    measureUptime(),
    measureDashboardLatency(),
    measureOutcomesLatency(),
    measureEmailDelivery(),
    measureCrossTenantIsolation(),
    measureCourseraIngestion(),
  ];

  const body: SloEnvelope = {
    generatedAt,
    window: 'last 7 days',
    slos,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
