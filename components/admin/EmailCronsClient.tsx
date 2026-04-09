'use client';

import { useState } from 'react';
import type { CronDef } from '@/lib/admin/cronRegistry';

type RunRecord = {
  id: string;
  status: string;
  summary: string;
  createdAt: string;
  meta: Record<string, unknown> | null;
};

type CronWithStatus = CronDef & {
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunSummary: string | null;
  recentRuns: RunRecord[];
};

type Props = {
  crons: CronWithStatus[];
  categoryColors: Record<string, string>;
};

const STATUS_COLOR: Record<string, string> = {
  ok: 'var(--color-green, #4a9b4f)',
  success: 'var(--color-green, #4a9b4f)',
  error: 'var(--color-accent)',
  errored: 'var(--color-accent)',
  inspection: 'var(--color-blue, #2b7bb9)',
  fallback_used: 'var(--color-gold)',
};

const STATUS_ICON: Record<string, string> = {
  ok: 'check_circle',
  success: 'check_circle',
  error: 'error',
  errored: 'error',
  inspection: 'info',
  fallback_used: 'warning',
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function EmailCronsClient({ crons: initialCrons, categoryColors }: Props) {
  const [crons, setCrons] = useState(initialCrons);
  const [triggeringIds, setTriggeringIds] = useState<Set<string>>(() => new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(() => new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggerResults, setTriggerResults] = useState<Record<string, { ok: boolean; result: unknown; error?: string }>>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleTrigger = async (cron: CronWithStatus) => {
    setTriggeringIds(prev => new Set(prev).add(cron.id));
    setTriggerResults(prev => ({ ...prev, [cron.id]: undefined as unknown as { ok: boolean; result: unknown } }));
    try {
      const res = await fetch(`/api/admin/email-crons/${cron.id}/trigger`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json() as { ok: boolean; result: unknown; error?: string; durationMs?: number };
      setTriggerResults(prev => ({ ...prev, [cron.id]: data }));

      // Optimistically add a run record to local state
      if (data.ok) {
        setCrons(prev => prev.map(c => c.id === cron.id ? {
          ...c,
          lastRunAt: new Date().toISOString(),
          lastRunStatus: 'ok',
          lastRunSummary: `Manual trigger: ${JSON.stringify(data.result).slice(0, 150)}`,
          recentRuns: [
            {
              id: `local-${Date.now()}`,
              status: 'ok',
              summary: `Manual trigger: ${JSON.stringify(data.result).slice(0, 150)}`,
              createdAt: new Date().toISOString(),
              meta: data.result as Record<string, unknown> | null,
            },
            ...c.recentRuns.slice(0, 7),
          ],
        } : c));
      }
    } catch (e) {
      setTriggerResults(prev => ({ ...prev, [cron.id]: { ok: false, result: null, error: e instanceof Error ? e.message : 'Network error' } }));
    } finally {
      setTriggeringIds(prev => {
        const next = new Set(prev);
        next.delete(cron.id);
        return next;
      });
    }
  };

  const handleToggle = async (cron: CronWithStatus) => {
    setTogglingIds(prev => new Set(prev).add(cron.id));
    const newEnabled = !cron.enabled;
    try {
      const res = await fetch(`/api/admin/email-crons/${cron.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: newEnabled }),
      });
      if (res.ok) {
        setCrons(prev => prev.map(c => c.id === cron.id ? { ...c, enabled: newEnabled } : c));
      }
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(cron.id);
        return next;
      });
    }
  };

  const categories = ['all', ...Array.from(new Set(crons.map(c => c.category)))];
  const filtered = filterCategory === 'all' ? crons : crons.filter(c => c.category === filterCategory);

  return (
    <div>
      {/* Category filter */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '9999px',
              border: filterCategory === cat ? '1px solid var(--color-accent)' : '1px solid var(--outline-variant)',
              background: filterCategory === cat ? 'rgba(173,44,77,0.1)' : 'transparent',
              color: filterCategory === cat ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {cat === 'all' ? `All (${crons.length})` : `${cat} (${crons.filter(c => c.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* Cron cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {filtered.map(cron => {
          const isExpanded = expandedId === cron.id;
          const isTriggeringThis = triggeringIds.has(cron.id);
          const isTogglingThis = togglingIds.has(cron.id);
          const triggerResult = triggerResults[cron.id];
          const accentColor = categoryColors[cron.category] ?? 'var(--color-accent)';

          return (
            <div
              key={cron.id}
              className="portal-card portal-card--flat"
              style={{ overflow: 'hidden', opacity: cron.enabled ? 1 : 0.65 }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1.125rem 1.25rem' }}>
                {/* Icon */}
                <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.75rem', background: `color-mix(in srgb, ${accentColor} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', color: accentColor, fontVariationSettings: "'FILL' 1" }}>{cron.icon}</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-on-surface)', margin: 0 }}>{cron.name}</h3>
                    <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '9999px', background: `color-mix(in srgb, ${accentColor} 10%, transparent)`, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      {cron.category}
                    </span>
                    {!cron.enabled && (
                      <span style={{ fontSize: '0.625rem', fontWeight: 800, padding: '0.1rem 0.4rem', borderRadius: '9999px', background: 'rgba(173,44,77,0.1)', color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                        Disabled
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.375rem', lineHeight: 1.45 }}>{cron.description}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>schedule</span>
                      {cron.scheduleLabel}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>group</span>
                      {cron.audienceDescription}
                    </span>
                    {cron.lastRunAt && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', color: STATUS_COLOR[cron.lastRunStatus ?? ''] ?? 'var(--color-on-surface-variant)', fontVariationSettings: "'FILL' 1" }}>
                          {STATUS_ICON[cron.lastRunStatus ?? ''] ?? 'radio_button_unchecked'}
                        </span>
                        Last run {timeAgo(cron.lastRunAt)}
                      </span>
                    )}
                    {!cron.lastRunAt && (
                      <span style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}>Never run</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, alignItems: 'flex-end' }}>
                  {/* Enable/disable toggle */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isTogglingThis ? 'default' : 'pointer' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>
                      {cron.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <div
                      onClick={() => !isTogglingThis && void handleToggle(cron)}
                      style={{
                        width: '2.25rem', height: '1.25rem', borderRadius: '9999px',
                        background: cron.enabled ? 'var(--color-accent)' : 'var(--surface-container-highest)',
                        position: 'relative', cursor: isTogglingThis ? 'default' : 'pointer',
                        transition: 'background 0.2s', flexShrink: 0,
                        opacity: isTogglingThis ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        position: 'absolute', top: '0.1875rem',
                        left: cron.enabled ? 'calc(100% - 1rem)' : '0.1875rem',
                        width: '0.875rem', height: '0.875rem', borderRadius: '50%',
                        background: '#fff', transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      }} />
                    </div>
                  </label>

                  {/* Manual trigger */}
                  <button
                    type="button"
                    onClick={() => !isTriggeringThis && void handleTrigger(cron)}
                    disabled={isTriggeringThis}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.4rem 0.875rem', borderRadius: '0.5rem',
                      border: '1px solid var(--outline-variant)',
                      background: isTriggeringThis ? 'var(--surface-container-high)' : 'var(--surface-container)',
                      color: 'var(--color-on-surface)', fontWeight: 700, fontSize: '0.8125rem',
                      cursor: isTriggeringThis ? 'default' : 'pointer',
                      opacity: isTriggeringThis ? 0.7 : 1, whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', fontVariationSettings: isTriggeringThis ? "'FILL' 0" : "'FILL' 1", animation: isTriggeringThis ? 'spin 1s linear infinite' : 'none' }}>
                      {isTriggeringThis ? 'progress_activity' : 'play_arrow'}
                    </span>
                    {isTriggeringThis ? 'Running…' : 'Run now'}
                  </button>

                  {/* Expand/collapse */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : cron.id)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.625rem', borderRadius: '0.5rem', border: 'none', background: 'transparent', color: 'var(--color-on-surface-variant)', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    {isExpanded ? 'Hide history' : `History (${cron.recentRuns.length})`}
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                  </button>
                </div>
              </div>

              {/* Trigger result banner */}
              {triggerResult && (
                <div style={{ margin: '0 1.25rem', padding: '0.75rem 1rem', borderRadius: '0.625rem', background: triggerResult.ok ? 'rgba(74,155,79,0.08)' : 'rgba(173,44,77,0.08)', border: `1px solid ${triggerResult.ok ? 'rgba(74,155,79,0.2)' : 'rgba(173,44,77,0.2)'}`, marginBottom: '0.875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: triggerResult.ok ? '0.375rem' : 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: triggerResult.ok ? 'var(--color-green, #4a9b4f)' : 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>
                      {triggerResult.ok ? 'check_circle' : 'error'}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: triggerResult.ok ? 'var(--color-green, #4a9b4f)' : 'var(--color-accent)' }}>
                      {triggerResult.ok ? 'Triggered successfully' : `Failed: ${triggerResult.error}`}
                    </span>
                  </div>
                  {triggerResult.ok && triggerResult.result !== null && triggerResult.result !== undefined && (
                    <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                      {JSON.stringify(triggerResult.result as Record<string, unknown>, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {/* Run history */}
              {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '1rem 1.25rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>Run History</p>
                  {cron.recentRuns.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>No runs recorded yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cron.recentRuns.map((run) => {
                        const runColor = STATUS_COLOR[run.status] ?? 'var(--color-on-surface-variant)';
                        const runIcon = STATUS_ICON[run.status] ?? 'radio_button_unchecked';
                        const runMeta = run.meta;
                        const isManual = (runMeta as Record<string, unknown> | null)?.manual === true;
                        return (
                          <div key={run.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '0.625rem', background: 'var(--surface-container-low)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: runColor, fontVariationSettings: "'FILL' 1", flexShrink: 0, marginTop: '0.1rem' }}>{runIcon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: runColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{run.status}</span>
                                {isManual && <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '9999px', background: 'rgba(43,123,185,0.1)', color: 'var(--color-blue, #2b7bb9)' }}>Manual</span>}
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginLeft: 'auto' }}>{timeAgo(run.createdAt)}</span>
                              </div>
                              <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                {run.summary}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ marginTop: '0.875rem', padding: '0.625rem 0.75rem', background: 'var(--surface-container-low)', borderRadius: '0.5rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontFamily: 'ui-monospace, monospace' }}>
                    API path: <strong style={{ color: 'var(--color-on-surface)' }}>{cron.method} {cron.apiPath}</strong>
                    <span style={{ marginLeft: '0.75rem' }}>Schedule: <strong style={{ color: 'var(--color-on-surface)' }}>{cron.schedule}</strong></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
