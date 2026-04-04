'use client';

import { useState, useMemo } from 'react';

interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  eventName: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  sourcePage: string | null;
  sessionId: string | null;
  createdAt: string;
}

export default function AuditLogsClient({ events }: { events: AuditEvent[] }) {
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const eventTypes = useMemo(() => {
    const set = new Set(events.map((e) => e.eventName));
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (eventFilter && e.eventName !== eventFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.userName.toLowerCase().includes(q) ||
          e.userEmail.toLowerCase().includes(q) ||
          e.eventName.toLowerCase().includes(q) ||
          e.entityType?.toLowerCase().includes(q) ||
          e.sourcePage?.toLowerCase().includes(q) ||
          false
        );
      }
      return true;
    });
  }, [events, search, eventFilter]);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px',
            minHeight: '44px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            border: '1px solid var(--outline-variant)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--surface-container)',
            color: 'var(--color-on-surface)',
          }}
        />
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
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
          <option value="">All events ({events.length})</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>
              {t} ({events.filter((e) => e.eventName === t).length})
            </option>
          ))}
        </select>
      </div>

      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-3)' }}>
        Showing {filtered.length} of {events.length} events
      </div>

      {/* Desktop table */}
      <div className="wa-hidden wa-md:wa-block" style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--outline-variant)',
                textAlign: 'left',
              }}
            >
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Time</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>User</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Event</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Entity</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Source</th>
              <th style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr
                key={e.id}
                style={{
                  borderBottom: '1px solid var(--outline-variant)',
                  cursor: e.metadata ? 'pointer' : 'default',
                }}
                onClick={() => e.metadata && setExpandedId(expandedId === e.id ? null : e.id)}
              >
                <td style={{ padding: '0.625rem 0.5rem', whiteSpace: 'nowrap', color: 'var(--color-on-surface-variant)' }}>
                  {formatTime(e.createdAt)}
                </td>
                <td style={{ padding: '0.625rem 0.5rem' }}>
                  <div style={{ fontWeight: 500 }}>{e.userName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{e.userEmail}</div>
                </td>
                <td style={{ padding: '0.625rem 0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.125rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(173,44,77,0.1)',
                      color: 'var(--color-accent)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {e.eventName}
                  </span>
                </td>
                <td style={{ padding: '0.625rem 0.5rem', color: 'var(--color-on-surface-variant)' }}>
                  {e.entityType ? `${e.entityType}${e.entityId ? ` #${e.entityId.slice(0, 8)}` : ''}` : '—'}
                </td>
                <td style={{ padding: '0.625rem 0.5rem', color: 'var(--color-on-surface-variant)' }}>
                  {e.sourcePage || '—'}
                </td>
                <td style={{ padding: '0.625rem 0.5rem' }}>
                  {e.metadata ? (
                    <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)' }}>
                      {expandedId === e.id ? 'expand_less' : 'expand_more'}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                  No events match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="wa-md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {filtered.map((e) => (
          <div
            key={e.id}
            style={{
              background: 'var(--surface-container)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.875rem 1rem',
            }}
            onClick={() => e.metadata && setExpandedId(expandedId === e.id ? null : e.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.125rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(173,44,77,0.1)',
                  color: 'var(--color-accent)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                {e.eventName}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{formatTime(e.createdAt)}</span>
            </div>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{e.userName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              {e.entityType && `${e.entityType} `}
              {e.sourcePage && `· ${e.sourcePage}`}
            </div>
            {expandedId === e.id && e.metadata && (
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
                }}
              >
                {JSON.stringify(e.metadata, null, 2)}
              </pre>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
            No events match your filters.
          </div>
        )}
      </div>
    </div>
  );
}
