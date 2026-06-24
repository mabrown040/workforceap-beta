'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  DesignSurface,
  KpiStrip,
  DataTable,
  StatusTag,
  type Column,
  type KpiItem,
  type KitTone,
} from '@/components/portal/kit';

interface WebhookEvent {
  id: string;
  source: string;
  eventType: string | null;
  eventId: string | null;
  payloadSize: number;
  processingTimeMs: number | null;
  status: string;
  httpStatusCode: number | null;
  errorMessage: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WebhookStats {
  total: number;
  byStatus: {
    success?: number;
    failed?: number;
    retrying?: number;
    dead_letter?: number;
    [key: string]: number | undefined;
  };
}

// status → kit tone: success green, failed crimson, retrying blue, dead_letter
// orange/gold, fallback gray. Preserves the prior STATUS_STYLES semantics.
function toneFor(status: string): KitTone {
  switch (status) {
    case 'success':
      return 'ok';
    case 'failed':
      return 'alert';
    case 'retrying':
      return 'info';
    case 'dead_letter':
      return 'warn';
    default:
      return 'muted';
  }
}

// Tag CSS is uppercase; replace underscores so 'dead_letter' still reads as
// "DEAD LETTER" rather than "DEAD_LETTER" (prior view used capitalize).
function labelize(status: string): string {
  return status.replace(/_/g, ' ');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildHref(
  page: number,
  q: string,
  source: string,
  status: string,
  dateFrom: string,
  dateTo: string
): string {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (source.trim()) params.set('source', source.trim());
  if (status.trim()) params.set('status', status.trim());
  if (dateFrom.trim()) params.set('dateFrom', dateFrom.trim());
  if (dateTo.trim()) params.set('dateTo', dateTo.trim());
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/admin/webhook-events?${s}` : '/admin/webhook-events';
}

export default function WebhookEventsClient({
  events,
  stats,
  page,
  totalPages,
  pageSize,
  totalMatching,
  initialQ,
  initialSource,
  initialStatus,
  initialDateFrom,
  initialDateTo,
  sources,
  statuses,
}: {
  events: WebhookEvent[];
  stats: WebhookStats;
  page: number;
  totalPages: number;
  pageSize: number;
  totalMatching: number;
  initialQ: string;
  initialSource: string;
  initialStatus: string;
  initialDateFrom: string;
  initialDateTo: string;
  sources: { name: string; count: number }[];
  statuses: { name: string; count: number }[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const start = totalMatching === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalMatching);

  const kpis: KpiItem[] = [
    { label: '7d Total', value: stats.total.toLocaleString(), color: 'accent' },
    { label: 'Success', value: (stats.byStatus.success ?? 0).toLocaleString(), color: 'success' },
    { label: 'Failed', value: (stats.byStatus.failed ?? 0).toLocaleString(), color: 'text' },
    { label: 'Retrying', value: (stats.byStatus.retrying ?? 0).toLocaleString(), color: 'info' },
    { label: 'Dead Letter', value: (stats.byStatus.dead_letter ?? 0).toLocaleString(), color: 'gold' },
  ];

  const toggleExpand = (e: WebhookEvent) => {
    if (e.errorMessage) setExpandedId(expandedId === e.id ? null : e.id);
  };

  const errorPre = (msg: string) => (
    <pre
      style={{
        marginTop: '0.5rem',
        padding: '0.5rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--surface-container-highest)',
        fontSize: '0.75rem',
        overflow: 'auto',
        maxHeight: '200px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: '#dc2626',
      }}
    >
      {msg}
    </pre>
  );

  const columns: Column<WebhookEvent>[] = [
    {
      key: 'time',
      header: 'Time',
      render: (e) => (
        <span style={{ whiteSpace: 'nowrap', color: 'var(--wa-muted)' }}>{formatTime(e.createdAt)}</span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (e) => <span style={{ fontWeight: 700 }}>{e.source}</span>,
    },
    {
      key: 'eventType',
      header: 'Event',
      render: (e) => <span style={{ color: 'var(--wa-muted)' }}>{e.eventType ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusTag tone={toneFor(e.status)}>{labelize(e.status)}</StatusTag>,
    },
    {
      key: 'payload',
      header: 'Payload',
      render: (e) => (
        <span style={{ whiteSpace: 'nowrap', color: 'var(--wa-muted)' }}>{formatBytes(e.payloadSize)}</span>
      ),
    },
    {
      key: 'processing',
      header: 'Time',
      render: (e) => (
        <span style={{ whiteSpace: 'nowrap', color: 'var(--wa-muted)' }}>
          {e.processingTimeMs ? `${e.processingTimeMs}ms` : '—'}
        </span>
      ),
    },
    {
      key: 'retry',
      header: 'Retry',
      render: (e) => (
        <span style={{ whiteSpace: 'nowrap', color: 'var(--wa-muted)' }}>
          {e.retryCount > 0 ? `${e.retryCount}` : '—'}
          {e.nextRetryAt ? ` · ${formatTime(e.nextRetryAt)}` : ''}
        </span>
      ),
    },
    {
      key: 'details',
      header: '',
      align: 'right',
      render: (e) =>
        e.errorMessage ? (
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '1.125rem', color: 'var(--wa-muted)' }}
            aria-hidden="true"
          >
            {expandedId === e.id ? 'expand_less' : 'expand_more'}
          </span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <DesignSurface surface="dense">
      <div className="wa-mb-5">
        <KpiStrip items={kpis} cols={5} />
      </div>

      {/* Filters — GET form resets to page 1 */}
      <form
        action="/admin/webhook-events"
        method="get"
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <label style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Search</span>
          <input
            type="text"
            name="q"
            placeholder="Search source, event ID, error…"
            defaultValue={initialQ}
            style={{
              minHeight: '44px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container)',
              color: 'var(--color-on-surface)',
            }}
          />
        </label>
        <label style={{ minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Source</span>
          <select
            name="source"
            defaultValue={initialSource}
            style={{
              minHeight: '44px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container)',
              color: 'var(--color-on-surface)',
            }}
          >
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>Status</span>
          <select
            name="status"
            defaultValue={initialStatus}
            style={{
              minHeight: '44px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container)',
              color: 'var(--color-on-surface)',
            }}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.count})
              </option>
            ))}
          </select>
        </label>
        <label style={{ minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>From</span>
          <input
            type="date"
            name="dateFrom"
            defaultValue={initialDateFrom}
            style={{
              minHeight: '44px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container)',
              color: 'var(--color-on-surface)',
            }}
          />
        </label>
        <label style={{ minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>To</span>
          <input
            type="date"
            name="dateTo"
            defaultValue={initialDateTo}
            style={{
              minHeight: '44px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--surface-container)',
              color: 'var(--color-on-surface)',
            }}
          />
        </label>
        <button
          type="submit"
          style={{
            minHeight: '44px',
            padding: '0 1.25rem',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </form>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
          {totalMatching === 0
            ? 'No events match'
            : `Showing ${start.toLocaleString()}–${end.toLocaleString()} of ${totalMatching.toLocaleString()} events`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            href={buildHref(Math.max(1, page - 1), initialQ, initialSource, initialStatus, initialDateFrom, initialDateTo)}
            aria-disabled={page <= 1}
            style={{
              pointerEvents: page <= 1 ? 'none' : undefined,
              opacity: page <= 1 ? 0.45 : 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Previous
          </Link>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            Page {page} / {totalPages}
          </span>
          <Link
            href={buildHref(Math.min(totalPages, page + 1), initialQ, initialSource, initialStatus, initialDateFrom, initialDateTo)}
            aria-disabled={page >= totalPages}
            style={{
              pointerEvents: page >= totalPages ? 'none' : undefined,
              opacity: page >= totalPages ? 0.45 : 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-accent)',
              textDecoration: 'none',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Next
          </Link>
        </div>
      </div>

      <DataTable<WebhookEvent>
        columns={columns}
        rows={events}
        rowKey={(e) => e.id}
        minWidth={760}
        mobile="cards"
        onRowClick={toggleExpand}
        emptyTitle="No webhook events"
        emptyDescription="No events match your filters."
        cardRender={(e) => (
          <div className="wa-kit-card wa-kit-card--sm">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: '0.375rem',
              }}
            >
              <span style={{ fontWeight: 700 }}>{e.source}</span>
              <span style={{ flexShrink: 0 }}>
                <StatusTag tone={toneFor(e.status)}>{labelize(e.status)}</StatusTag>
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--wa-muted)' }}>
              {e.eventType ?? '—'} · {formatBytes(e.payloadSize)} · {e.processingTimeMs ? `${e.processingTimeMs}ms` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--wa-muted)' }}>
              {formatTime(e.createdAt)}
              {e.retryCount > 0 ? ` · Retry ${e.retryCount}` : ''}
            </div>
            {expandedId === e.id && e.errorMessage ? errorPre(e.errorMessage) : null}
          </div>
        )}
      />

      {/* Desktop inline error detail for the expanded row (kit DataTable has no
          inline expansion row). Hidden on mobile where cardRender shows it. */}
      {(() => {
        const expanded = events.find((e) => e.id === expandedId && e.errorMessage);
        if (!expanded || !expanded.errorMessage) return null;
        return (
          <div className="wa-hidden lg:wa-block" style={{ marginTop: '0.5rem' }}>
            {errorPre(expanded.errorMessage)}
          </div>
        );
      })()}
    </DesignSurface>
  );
}
