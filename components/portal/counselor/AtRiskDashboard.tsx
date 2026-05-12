'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Filter, Loader2, RotateCcw, ShieldAlert, ShieldCheck, ShieldHalf } from 'lucide-react';
import DataTable from '@/components/portal/ui/DataTable';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import type { BadgeVariant } from '@/components/portal/StatusBadge';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AtRiskFactor {
  name: string;
  weight: number;
  description: string;
}

interface AtRiskMember {
  userId: string;
  alertId: string;
  name: string;
  email: string;
  phone: string | null;
  score: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'open' | 'acknowledged' | 'resolved';
  factors: AtRiskFactor[];
  enrolledProgram: string | null;
  enrolledAt: string | null;
  memberSince: string;
  profile: {
    employmentStatus: string | null;
    educationLevel: string | null;

  } | null;
  alertCreatedAt: string;
  alertUpdatedAt: string;
}

interface ApiResponse {
  count: number;
  threshold: number;
  results: AtRiskMember[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_LEVEL_ORDER: Array<AtRiskMember['riskLevel']> = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const RISK_CONFIG: Record<
  AtRiskMember['riskLevel'],
  { label: string; variant: BadgeVariant; color: string; icon: typeof ShieldAlert }
> = {
  CRITICAL: { label: 'Critical', variant: 'error', color: 'var(--color-accent)', icon: ShieldAlert },
  HIGH: { label: 'High', variant: 'warning', color: 'var(--color-gold)', icon: ShieldHalf },
  MEDIUM: { label: 'Medium', variant: 'info', color: 'var(--color-blue)', icon: ShieldCheck },
  LOW: { label: 'Low', variant: 'success', color: 'var(--color-green)', icon: ShieldCheck },
};

const STATUS_CONFIG: Record<AtRiskMember['status'], { label: string; variant: BadgeVariant }> = {
  open: { label: 'Open', variant: 'error' },
  acknowledged: { label: 'Acknowledged', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}

function getSeverityThreshold(level: AtRiskMember['riskLevel']): number {
  switch (level) {
    case 'CRITICAL': return 70;
    case 'HIGH': return 50;
    case 'MEDIUM': return 30;
    case 'LOW': return 0;
  }
}

// ─── Render helpers ───────────────────────────────────────────────────────

function RiskBadge({ level }: { level: AtRiskMember['riskLevel'] }) {
  const cfg = RISK_CONFIG[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <cfg.icon size={14} style={{ color: cfg.color }} aria-hidden />
      <StatusBadge label={cfg.label} variant={cfg.variant} />
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const level = score >= 70 ? 'CRITICAL' : score >= 50 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';
  const color = RISK_CONFIG[level].color;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '2.5rem',
        height: '2.5rem',
        borderRadius: '50%',
        fontWeight: 700,
        fontSize: '0.85rem',
        color,
        background: 'color-mix(in srgb, ' + color + ' 12%, transparent)',
        border: '2px solid ' + color + '40',
      }}
    >
      {score}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AtRiskDashboard() {
  const [members, setMembers] = useState<AtRiskMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState<AtRiskMember['riskLevel'] | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AtRiskMember['status'] | 'all'>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action states
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      // Always fetch with threshold 0 so we get all risk levels; filter client-side by severity
      params.set('threshold', '0');

      const res = await fetch(`/api/admin/members/at-risk?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load at-risk members (${res.status})`);
      }
      const data: ApiResponse = await res.json();
      setMembers(data.results);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredMembers = useMemo(() => {
    let rows = members;
    if (severityFilter !== 'all') {
      rows = rows.filter((m) => m.riskLevel === severityFilter);
    }
    // status is already filtered server-side, but re-filter for safety
    if (statusFilter !== 'all') {
      rows = rows.filter((m) => m.status === statusFilter);
    }
    // Sort by score descending
    return rows.sort((a, b) => b.score - a.score);
  }, [members, severityFilter, statusFilter]);

  const severityCounts = useMemo(() => {
    const counts: Record<AtRiskMember['riskLevel'], number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const m of members) counts[m.riskLevel]++;
    return counts;
  }, [members]);

  const statusCounts = useMemo(() => {
    const counts: Record<AtRiskMember['status'], number> = { open: 0, acknowledged: 0, resolved: 0 };
    for (const m of members) counts[m.status]++;
    return counts;
  }, [members]);

  const allSelectedOnPage = filteredMembers.length > 0 && filteredMembers.every((m) => selectedIds.has(m.alertId));

  function toggleSelectAll() {
    if (allSelectedOnPage) {
      const next = new Set(selectedIds);
      for (const m of filteredMembers) next.delete(m.alertId);
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      for (const m of filteredMembers) next.add(m.alertId);
      setSelectedIds(next);
    }
  }

  function toggleSelectOne(alertId: string) {
    const next = new Set(selectedIds);
    if (next.has(alertId)) next.delete(alertId);
    else next.add(alertId);
    setSelectedIds(next);
  }

  async function updateStatus(alertId: string, status: 'acknowledged' | 'resolved') {
    setActingIds((prev) => new Set(prev).add(alertId));
    try {
      const res = await fetch('/api/admin/members/at-risk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Update failed');
      }
      // Optimistically update local state
      setMembers((prev) =>
        prev.map((m) => (m.alertId === alertId ? { ...m, status } : m))
      );
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActingIds((prev) => {
        const next = new Set(prev);
        next.delete(alertId);
        return next;
      });
    }
  }

  async function bulkAcknowledge() {
    if (selectedIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map((alertId) =>
        fetch('/api/admin/members/at-risk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId, status: 'acknowledged' }),
        })
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        alert(`${failed} of ${selectedIds.size} updates failed. Refreshing...`);
      }
      setSelectedIds(new Set());
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBulkActionLoading(false);
    }
  }

  // ─── Loading / Error ──────────────────────────────────────────────────────

  if (loading && members.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '3rem 1rem', color: 'var(--color-on-surface-variant)' }}>
        <Loader2 size={20} className="wa-animate-spin" />
        <span>Loading at-risk members…</span>
      </div>
    );
  }

  if (error && members.length === 0) {
    return (
      <div
        className="content-card"
        style={{
          padding: '1.25rem',
          borderLeft: '4px solid var(--color-accent)',
          background: 'var(--color-surface-variant)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-accent)' }}>Couldn’t load at-risk members</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{error}</p>
        <button
          type="button"
          className="btn btn-muted btn-sm"
          onClick={fetchData}
          style={{ marginTop: '0.75rem' }}
        >
          <RotateCcw size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
          Retry
        </button>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary bar */}
      <div
        className="content-card"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {RISK_LEVEL_ORDER.map((level) => (
            <SeverityChip
              key={level}
              level={level}
              count={severityCounts[level]}
              active={severityFilter === level}
              onClick={() => setSeverityFilter((prev) => (prev === level ? 'all' : level))}
            />
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {(['open', 'acknowledged', 'resolved'] as const).map((s) => (
            <StatusChip
              key={s}
              status={s}
              count={statusCounts[s]}
              active={statusFilter === s}
              onClick={() => setStatusFilter((prev) => (prev === s ? 'all' : s))}
            />
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {(severityFilter !== 'all' || statusFilter !== 'all') && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            <Filter size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
            Filters:
          </span>
          {severityFilter !== 'all' && (
            <FilterTag
              label={`Severity: ${RISK_CONFIG[severityFilter].label}`}
              onRemove={() => setSeverityFilter('all')}
            />
          )}
          {statusFilter !== 'all' && (
            <FilterTag
              label={`Status: ${STATUS_CONFIG[statusFilter].label}`}
              onRemove={() => setStatusFilter('all')}
            />
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => { setSeverityFilter('all'); setStatusFilter('all'); }}
            style={{ fontSize: '0.75rem' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.625rem',
            background: 'color-mix(in srgb, var(--color-accent) 6%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-accent) 18%, var(--outline-variant))',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            {selectedIds.size} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={bulkActionLoading}
              onClick={bulkAcknowledge}
            >
              {bulkActionLoading ? (
                <>
                  <Loader2 size={14} className="wa-animate-spin" style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                  Working…
                </>
              ) : (
                <>
                  <Check size={14} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                  Acknowledge selected
                </>
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
        Showing {filteredMembers.length} member{filteredMembers.length === 1 ? '' : 's'}
        {loading && ' · Refreshing…'}
      </p>

      {/* Desktop table */}
      <div className="wa-hidden md:wa-block">
        <DataTable
          columns={[
            {
              key: 'select',
              header: (
                <input
                  type="checkbox"
                  aria-label="Select all visible"
                  checked={allSelectedOnPage}
                  onChange={toggleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              ),
              cell: (row) => (
                <input
                  type="checkbox"
                  aria-label={`Select ${row.name}`}
                  checked={selectedIds.has(row.alertId)}
                  onChange={() => toggleSelectOne(row.alertId)}
                  style={{ cursor: 'pointer' }}
                />
              ),
              width: 40,
              align: 'center',
            },
            {
              key: 'score',
              header: 'Score',
              cell: (row) => <ScoreBadge score={row.score} />,
              width: 72,
              align: 'center',
            },
            {
              key: 'severity',
              header: 'Severity',
              cell: (row) => <RiskBadge level={row.riskLevel} />,
              width: 120,
            },
            {
              key: 'member',
              header: 'Member',
              cell: (row) => (
                <div>
                  <Link
                    href={`/counselor/students/${row.userId}`}
                    style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}
                  >
                    {row.name}
                  </Link>
                  <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                    {row.email}
                  </p>
                  {row.phone && (
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      {row.phone}
                    </p>
                  )}
                </div>
              ),
            },
            {
              key: 'factors',
              header: 'Risk Factors',
              cell: (row) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {row.factors.map((f) => (
                    <span
                      key={f.name}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '999px',
                        background: 'var(--surface-container-high)',
                        color: 'var(--color-on-surface-variant)',
                        fontWeight: 500,
                      }}
                      title={f.description}
                    >
                      {f.description}
                    </span>
                  ))}
                  {row.factors.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>—</span>
                  )}
                </div>
              ),
              hideOnMobile: true,
            },
            {
              key: 'program',
              header: 'Program',
              cell: (row) => (
                <span style={{ fontSize: '0.85rem' }}>
                  {row.enrolledProgram ?? 'Not enrolled'}
                </span>
              ),
              hideOnMobile: true,
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => <StatusBadge label={STATUS_CONFIG[row.status].label} variant={STATUS_CONFIG[row.status].variant} />,
              width: 120,
            },
            {
              key: 'actions',
              header: 'Actions',
              cell: (row) => {
                const isActing = actingIds.has(row.alertId);
                return (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {row.status === 'open' && (
                      <button
                        type="button"
                        className="btn btn-muted btn-sm"
                        disabled={isActing}
                        onClick={() => updateStatus(row.alertId, 'acknowledged')}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        {isActing ? <Loader2 size={12} className="wa-animate-spin" /> : 'Ack'}
                      </button>
                    )}
                    {row.status !== 'resolved' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isActing}
                        onClick={() => updateStatus(row.alertId, 'resolved')}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        {isActing ? <Loader2 size={12} className="wa-animate-spin" /> : 'Resolve'}
                      </button>
                    )}
                    <Link
                      href={`/counselor/students/${row.userId}`}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      View
                    </Link>
                  </div>
                );
              },
              width: 180,
            },
          ]}
          rows={filteredMembers}
          rowKey={(row) => row.alertId}
          emptyState={
            <PortalEmptyState
              title="No at-risk members match your filters"
              description="Try adjusting severity or status filters, or check back after the next nightly risk scan."
              icon={<AlertTriangle size={32} style={{ color: 'var(--color-gold)' }} />}
              primaryAction={{ label: 'Clear filters', href: '#', onClick: () => { setSeverityFilter('all'); setStatusFilter('all'); } }}
            />
          }
          scrollX
        />
      </div>

      {/* Mobile cards */}
      <div className="wa-block md:wa-hidden" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredMembers.length === 0 ? (
          <PortalEmptyState
            title="No at-risk members match your filters"
            description="Try adjusting severity or status filters, or check back after the next nightly risk scan."
            icon={<AlertTriangle size={32} style={{ color: 'var(--color-gold)' }} />}
            primaryAction={{ label: 'Clear filters', href: '#', onClick: () => { setSeverityFilter('all'); setStatusFilter('all'); } }}
          />
        ) : (
          filteredMembers.map((row) => (
            <MobileAtRiskCard
              key={row.alertId}
              row={row}
              selected={selectedIds.has(row.alertId)}
              onToggleSelect={() => toggleSelectOne(row.alertId)}
              onAcknowledge={() => updateStatus(row.alertId, 'acknowledged')}
              onResolve={() => updateStatus(row.alertId, 'resolved')}
              acting={actingIds.has(row.alertId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SeverityChip({
  level,
  count,
  active,
  onClick,
}: {
  level: AtRiskMember['riskLevel'];
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = RISK_CONFIG[level];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        border: `1.5px solid ${active ? cfg.color : 'transparent'}`,
        background: active ? `color-mix(in srgb, ${cfg.color} 14%, transparent)` : 'var(--surface-container-high)',
        color: cfg.color,
        cursor: 'pointer',
      }}
    >
      <cfg.icon size={14} />
      {cfg.label} · {count}
    </button>
  );
}

function StatusChip({
  status,
  count,
  active,
  onClick,
}: {
  status: AtRiskMember['status'];
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const color =
    cfg.variant === 'error'
      ? 'var(--color-accent)'
      : cfg.variant === 'warning'
        ? 'var(--color-gold)'
        : 'var(--color-green)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.75rem',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        border: `1.5px solid ${active ? color : 'transparent'}`,
        background: active ? `color-mix(in srgb, ${color} 14%, transparent)` : 'var(--surface-container-high)',
        color,
        cursor: 'pointer',
      }}
    >
      {cfg.label} · {count}
    </button>
  );
}

function FilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        background: 'var(--surface-container-high)',
        color: 'var(--color-on-surface)',
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '0.85rem',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </span>
  );
}

function MobileAtRiskCard({
  row,
  selected,
  onToggleSelect,
  onAcknowledge,
  onResolve,
  acting,
}: {
  row: AtRiskMember;
  selected: boolean;
  onToggleSelect: () => void;
  onAcknowledge: () => void;
  onResolve: () => void;
  acting: boolean;
}) {
  return (
    <div
      className="portal-card portal-card--flat"
      style={{
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        borderLeft: `4px solid ${RISK_CONFIG[row.riskLevel].color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} style={{ cursor: 'pointer' }} />
        <ScoreBadge score={row.score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/counselor/students/${row.userId}`}
            style={{ fontWeight: 700, color: 'inherit', textDecoration: 'none', fontSize: '0.95rem' }}
          >
            {row.name}
          </Link>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            {row.email}
          </p>
        </div>
        <RiskBadge level={row.riskLevel} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
        {row.factors.map((f) => (
          <span
            key={f.name}
            style={{
              fontSize: '0.75rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '999px',
              background: 'var(--surface-container-high)',
              color: 'var(--color-on-surface-variant)',
              fontWeight: 500,
            }}
          >
            {f.description}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <StatusBadge label={STATUS_CONFIG[row.status].label} variant={STATUS_CONFIG[row.status].variant} />
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {row.status === 'open' && (
            <button
              type="button"
              className="btn btn-muted btn-sm"
              disabled={acting}
              onClick={onAcknowledge}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              {acting ? <Loader2 size={12} className="wa-animate-spin" /> : 'Ack'}
            </button>
          )}
          {row.status !== 'resolved' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={acting}
              onClick={onResolve}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              {acting ? <Loader2 size={12} className="wa-animate-spin" /> : 'Resolve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
