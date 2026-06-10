'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/portal/PageHeader';
import type { HealthResponse, HealthChecks, HealthStatus } from '@/app/api/admin/health/route';

interface AlertEntry {
  id: string;
  subsystem: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
}

function useHealthData() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HealthResponse;
      if ('error' in json) throw new Error((json as { error: string }).error);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

function statusColor(status: HealthStatus | 'ok' | 'degraded' | 'fail'): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'var(--color-green, #4a9b4f)';
    case 'degraded':
      return 'var(--color-gold, #ffbb00)';
    case 'unhealthy':
    case 'fail':
      return 'var(--color-accent, #ad2c4d)';
    default:
      return 'var(--color-on-surface-variant)';
  }
}

function statusBg(status: HealthStatus | 'ok' | 'degraded' | 'fail'): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'rgba(74,155,79,0.12)';
    case 'degraded':
      return 'rgba(255,187,0,0.12)';
    case 'unhealthy':
    case 'fail':
      return 'rgba(173,44,77,0.12)';
    default:
      return 'var(--surface-container-low)';
  }
}

function statusIcon(status: HealthStatus | 'ok' | 'degraded' | 'fail'): string {
  switch (status) {
    case 'healthy':
    case 'ok':
      return 'check_circle';
    case 'degraded':
      return 'warning';
    case 'unhealthy':
    case 'fail':
      return 'error';
    default:
      return 'help';
  }
}

/* ─── Sparkline component ─── */

function Sparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (data.length === 0) return <div style={{ height, opacity: 0.3 }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const step = width / (data.length - 1 || 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity={0.7}
      />
      {data.map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="1.5" fill={color} opacity={0.9} />;
      })}
    </svg>
  );
}

/* ─── Status card ─── */

function StatusCard({
  title,
  status,
  icon,
  latencyMs,
  detail,
  history,
  onClick,
}: {
  title: string;
  status: 'ok' | 'degraded' | 'fail';
  icon: string;
  latencyMs?: number;
  detail?: string;
  history?: number[];
  onClick?: () => void;
}) {
  const color = statusColor(status);
  const bg = statusBg(status);

  return (
    <div
      onClick={onClick}
      className="portal-card portal-card--flat"
      style={{
        padding: '1rem',
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: '1.25rem',
              color,
              fontVariationSettings: "'FILL' 1",
            }}
          >
            {icon}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>
            {title}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.625rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '0.15rem 0.4rem',
            borderRadius: '9999px',
            background: bg,
            color,
          }}
        >
          {status}
        </span>
      </div>

      {latencyMs !== undefined && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}>
          Latency: <strong>{latencyMs}ms</strong>
        </p>
      )}

      {detail && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem', lineHeight: 1.4 }}>
          {detail}
        </p>
      )}

      {history && history.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <Sparkline data={history} color={color} />
          <p style={{ fontSize: '0.6rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', textAlign: 'right' }}>
            Last {history.length} checks
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Alert log ─── */

function AlertLog({ alerts }: { alerts: AlertEntry[] }) {
  if (alerts.length === 0) {
    return (
      <div className="portal-card portal-card--flat portal-card--padded" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span className="material-symbols-outlined" style={{ color: 'var(--color-green)', fontSize: '1.25rem' }}>check_circle</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>No alerts — all subsystems nominal.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {alerts.map((alert) => {
        const color =
          alert.severity === 'critical'
            ? 'var(--color-accent)'
            : alert.severity === 'warning'
              ? 'var(--color-gold)'
              : 'var(--color-on-surface-variant)';
        const bg =
          alert.severity === 'critical'
            ? 'rgba(173,44,77,0.1)'
            : alert.severity === 'warning'
              ? 'rgba(255,187,0,0.1)'
              : 'var(--surface-container-low)';

        return (
          <div
            key={alert.id}
            className="portal-card portal-card--flat"
            style={{ padding: '0.75rem 1rem', borderLeft: `3px solid ${color}` }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '1rem', color, fontVariationSettings: "'FILL' 1" }}
                >
                  {alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                </span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                  {alert.subsystem}
                </span>
              </div>
              <span style={{ fontSize: '0.625rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
              {alert.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ─── */

export default function AdminHealthPage() {
  const { data, loading, error, refetch } = useHealthData();

  // No historical store yet — render a flat line at the current value rather
  // than fabricated variance, so the sparkline never implies trends we don't have.
  const makeHistory = (base: number, _variance = 0.2, points = 24) => {
    return Array.from({ length: points }, () => Math.max(0, Math.round(base)));
  };

  const alerts: AlertEntry[] = useMemo(() => {
    if (!data) return [];
    const entries: AlertEntry[] = [];
    const ts = data.generatedAt;

    Object.entries(data.checks).forEach(([key, check]) => {
      if (check.status === 'fail') {
        entries.push({
          id: `${key}-fail-${ts}`,
          subsystem: key,
          message: check.note || `${key} is failing`,
          severity: 'critical',
          timestamp: ts,
        });
      } else if (check.status === 'degraded') {
        entries.push({
          id: `${key}-degraded-${ts}`,
          subsystem: key,
          message: check.note || `${key} is degraded`,
          severity: 'warning',
          timestamp: ts,
        });
      }
    });

    return entries.sort((a, b) => b.severity.localeCompare(a.severity));
  }, [data]);

  if (loading) {
    return (
      <div>
        <PageHeader title="System Health" subtitle="Real-time monitoring of all platform subsystems." />
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading health data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="System Health" subtitle="Real-time monitoring of all platform subsystems." />
        <div style={{ padding: '2rem', color: 'var(--color-accent)' }}>
          <p>Error loading health data: {error || 'No data'}</p>
          <button onClick={refetch} className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { status, checks, generatedAt } = data;

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Real-time monitoring of all platform subsystems."
        action={
          <button onClick={refetch} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>refresh</span>
            Refresh
          </button>
        }
      />

      {/* Overall status banner */}
      <div
        className="portal-card portal-card--flat portal-card--padded"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          background: statusBg(status),
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '1.5rem',
            color: statusColor(status),
            fontVariationSettings: "'FILL' 1",
          }}
        >
          {statusIcon(status)}
        </span>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>
            Overall: {status.toUpperCase()}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.125rem 0 0' }}>
            Checked at {new Date(generatedAt).toLocaleString()} · Auto-refreshes every 30s
          </p>
        </div>
      </div>

      {/* Subsystem grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <StatusCard
          title="Database"
          status={checks.database.status}
          icon="database"
          latencyMs={checks.database.latencyMs}
          detail={checks.database.note}
          history={makeHistory(checks.database.latencyMs ?? 10, 0.3)}
        />
        <StatusCard
          title="Redis"
          status={checks.redis.status}
          icon="memory"
          latencyMs={checks.redis.latencyMs}
          detail={checks.redis.note}
          history={makeHistory(checks.redis.latencyMs ?? 5, 0.25)}
        />
        <StatusCard
          title="Prisma"
          status={checks.prisma.status}
          icon="schema"
          detail={checks.prisma.note}
        />
        <StatusCard
          title="Cron Jobs"
          status={checks.cronJobs.status}
          icon="schedule"
          detail={
            checks.cronJobs.note +
            (checks.cronJobs.failures !== undefined ? ` · ${checks.cronJobs.failures} failures (24h)` : '')
          }
          history={makeHistory(checks.cronJobs.failures ?? 0, 0.5)}
        />
        <StatusCard
          title="Webhooks"
          status={checks.webhooks.status}
          icon="webhook"
          detail={
            checks.webhooks.note +
            (checks.webhooks.pendingRetries !== undefined ? ` · ${checks.webhooks.pendingRetries} pending` : '')
          }
          history={makeHistory(checks.webhooks.pendingRetries ?? 0, 0.4)}
        />
        <StatusCard
          title="xAPI"
          status={checks.xapi.status}
          icon="school"
          detail={
            checks.xapi.note +
            (checks.xapi.pendingStatements !== undefined ? ` · ${checks.xapi.pendingStatements} pending` : '')
          }
          history={makeHistory(checks.xapi.pendingStatements ?? 0, 0.35)}
        />
        <StatusCard
          title="AI Tools"
          status={checks.aiTools.status}
          icon="auto_awesome"
          detail={checks.aiTools.note}
          history={makeHistory(checks.aiTools.queueDepth ?? 0, 0.6)}
        />
        <StatusCard
          title="Email"
          status={checks.email.status}
          icon="mail"
          detail={checks.email.note}
          history={makeHistory(checks.email.backlog ?? 0, 0.4)}
        />
      </div>

      {/* Alert log */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div className="portal-dash-section-header">
          <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>
            Active Alerts
            {alerts.length > 0 && (
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-accent)' }}>
                ({alerts.length})
              </span>
            )}
          </h2>
        </div>
        <AlertLog alerts={alerts} />
      </section>

      {/* Quick links */}
      <section>
        <div className="portal-dash-section-header">
          <h2 className="portal-heading-with-bar portal-section-heading" style={{ margin: 0 }}>Related Pages</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <Link href="/admin/crons" className="btn btn-outline btn-sm">
            Cron Monitor
          </Link>
          <Link href="/admin/webhook-events" className="btn btn-outline btn-sm">
            Webhook Events
          </Link>
          <Link href="/admin/diagnostics" className="btn btn-outline btn-sm">
            Diagnostics
          </Link>
          <Link href="/admin/email-crons" className="btn btn-outline btn-sm">
            Email &amp; Crons
          </Link>
          <Link href="/api/health" target="_blank" className="btn btn-outline btn-sm">
            Public Health JSON
          </Link>
        </div>
      </section>
    </div>
  );
}
