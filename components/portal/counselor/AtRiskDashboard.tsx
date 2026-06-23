'use client';

import { useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Filter,
  Loader2,
  MessageSquare,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react';
import DataTable from '@/components/portal/ui/DataTable';
import StatusBadge from '@/components/portal/StatusBadge';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import type { BadgeVariant } from '@/components/portal/StatusBadge';
import AtRiskDetailModal from './AtRiskDetailModal';

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
  status: 'open' | 'acknowledged' | 'resolved' | 'escalated';
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
  /** ISO timestamp: latest portal activity signal from the API (member events → Coursera sync → joined). */
  lastActivityAt?: string;
}

interface ApiResponse {
  count: number;
  threshold: number;
  results: AtRiskMember[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const RISK_LEVEL_ORDER: Array<AtRiskMember['riskLevel']> = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const RISK_SORT_INDEX: Record<AtRiskMember['riskLevel'], number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

type SortMode = 'risk' | 'last_activity';

function activityTimestamp(m: AtRiskMember): number {
  const raw = m.lastActivityAt ?? m.memberSince;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

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
  escalated: { label: 'Escalated', variant: 'accent' },
};

/** Hover tooltips for severity chips (matches THRESHOLDS in lib/member/atRiskScoring.ts). */
const SEVERITY_TOOLTIP: Record<AtRiskMember['riskLevel'], string> = {
  CRITICAL: 'Score ≥70. Highest urgency—call or message within 24–48 hours.',
  HIGH: 'Score 50–69. Strong risk signals—contact this week.',
  MEDIUM: 'Score 30–49. Watch and nudge if the score climbs.',
  LOW: 'Score under 30. Normal support cadence unless it worsens.',
};

const STATUS_TOOLTIP: Record<AtRiskMember['status'], string> = {
  open: 'Not yet acknowledged in the dashboard—triage these first in your weekly pass.',
  acknowledged: 'You or your team started outreach or took ownership; still working the case.',
  resolved: 'Risk mitigated, member exited, or situation documented—use when the case is truly closed.',
  escalated: 'Escalated to admin for additional support—admin team should review.',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString();
}


function RiskBadge({ level }: { level: AtRiskMember['riskLevel'] }) {
  const cfg = RISK_CONFIG[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} title={SEVERITY_TOOLTIP[level]}>
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
      title={`Risk score ${score}. ${SEVERITY_TOOLTIP[level]}`}
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
  const [unacknowledgedOnly, setUnacknowledgedOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('risk');

  // Search + program filter
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail modal
  const [detailMember, setDetailMember] = useState<AtRiskMember | null>(null);

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

  const programOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of members) {
      if (m.enrolledProgram) set.add(m.enrolledProgram);
    }
    return Array.from(set).sort();
  }, [members]);

  const filteredMembers = useMemo(() => {
    let rows = members;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      );
    }
    if (severityFilter !== 'all') {
      rows = rows.filter((m) => m.riskLevel === severityFilter);
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((m) => m.status === statusFilter);
    }
    if (programFilter !== 'all') {
      rows = rows.filter((m) => m.enrolledProgram === programFilter);
    }
    if (unacknowledgedOnly) {
      rows = rows.filter((m) => m.status === 'open');
    }
    const ranked = [...rows];
    if (sortMode === 'risk') {
      ranked.sort((a, b) => {
        const byRisk = RISK_SORT_INDEX[a.riskLevel] - RISK_SORT_INDEX[b.riskLevel];
        if (byRisk !== 0) return byRisk;
        if (b.score !== a.score) return b.score - a.score;
        return activityTimestamp(a) - activityTimestamp(b);
      });
    } else {
      ranked.sort((a, b) => {
        const byActivity = activityTimestamp(a) - activityTimestamp(b);
        if (byActivity !== 0) return byActivity;
        const byRisk = RISK_SORT_INDEX[a.riskLevel] - RISK_SORT_INDEX[b.riskLevel];
        if (byRisk !== 0) return byRisk;
        return b.score - a.score;
      });
    }
    return ranked;
  }, [members, searchQuery, severityFilter, statusFilter, programFilter, unacknowledgedOnly, sortMode]);

  const severityCounts = useMemo(() => {
    const counts: Record<AtRiskMember['riskLevel'], number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const m of members) counts[m.riskLevel]++;
    return counts;
  }, [members]);

  const statusCounts = useMemo(() => {
    const counts: Record<AtRiskMember['status'], number> = { open: 0, acknowledged: 0, resolved: 0, escalated: 0 };
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

  async function updateStatus(alertId: string, status: 'acknowledged' | 'resolved' | 'escalated') {
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
    const openAlertIds = Array.from(selectedIds).filter((alertId) => {
      const m = members.find((x) => x.alertId === alertId);
      return m?.status === 'open';
    });
    if (openAlertIds.length === 0) {
      alert('No open (unacknowledged) alerts among the selected rows.');
      return;
    }
    setBulkActionLoading(true);
    try {
      const promises = openAlertIds.map((alertId) =>
        fetch('/api/admin/members/at-risk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId, status: 'acknowledged' }),
        }),
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        alert(`${failed} of ${openAlertIds.length} updates failed. Refreshing…`);
      }
      setSelectedIds(new Set());
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bulk update failed');
    } finally {
      setBulkActionLoading(false);
    }
  }

  function handleStatusChange(alertId: string, status: 'acknowledged' | 'resolved' | 'escalated') {
    setMembers((prev) =>
      prev.map((m) => (m.alertId === alertId ? { ...m, status } : m))
    );
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(alertId);
      return next;
    });
  }

  const openSelectedCount = useMemo(() => {
    let n = 0;
    for (const alertId of selectedIds) {
      const m = members.find((x) => x.alertId === alertId);
      if (m?.status === 'open') n += 1;
    }
    return n;
  }, [selectedIds, members]);

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
      <div
        className="content-card"
        style={{
          padding: '0.75rem 1rem',
          fontSize: '0.82rem',
          color: 'var(--color-on-surface-variant)',
          lineHeight: 1.55,
          borderLeft: '4px solid var(--color-blue)',
        }}
        title="Nightly job scores login gaps, training progress, counselor messages, and more. Use this list once a week minimum—start with open Critical and High."
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <span>
            <strong style={{ color: 'var(--color-on-surface)' }}>How to use this screen:</strong>{' '}
            Turn on <strong>Only unacknowledged</strong>, sort <strong>Severity ↑</strong>, then{' '}
            <strong>Message</strong> or call top rows. Click <strong>Ack</strong> after you reach out; click{' '}
            <strong>Resolve</strong> only when disengagement is fixed or the case is closed. Hover severity, status, and
            column headers for detail.
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              color: 'var(--color-on-surface-variant)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
            title="See docs/COUNSELOR-RUNBOOK.md in the repo for the full weekly checklist, call script, and CSV guide."
          >
            <BookOpen size={13} />
            Runbook
          </span>
        </div>
      </div>

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
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
          title="Click a severity to filter the table. Counts include every row returned by the server for your filters below."
        >
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
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
          title="Click a status to filter. Open = not yet acknowledged—your weekly triage queue."
        >
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

      {/* Search + program filter */}
      <div
        className="content-card"
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email…"
          style={{
            flex: 1,
            minWidth: '12rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-high)',
            color: 'inherit',
            fontSize: '0.85rem',
          }}
        />
        {programOptions.length > 0 && (
          <select
            value={programFilter}
            onChange={(e) => setProgramFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-high)',
              color: 'inherit',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="all">All programs</option>
            {programOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Sort + triage toggle */}
      <div
        className="content-card"
        role="toolbar"
        aria-label="List sort and filters"
        style={{
          padding: '0.75rem 1rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
            Sort
          </span>
          <SortModeButton
            active={sortMode === 'risk'}
            onClick={() => setSortMode('risk')}
            title="Highest severity first (Critical → Low), then score, then oldest activity."
          >
            Severity ↑
          </SortModeButton>
          <SortModeButton
            active={sortMode === 'last_activity'}
            onClick={() => setSortMode('last_activity')}
            title="Members with the oldest activity signal first—use mid-week to catch quiet accounts."
          >
            Oldest activity first
          </SortModeButton>
        </div>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Limits the table to alerts still in Open status—fastest way to see who still needs a first touch."
        >
          <input
            type="checkbox"
            checked={unacknowledgedOnly}
            onChange={(e) => setUnacknowledgedOnly(e.target.checked)}
            style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
            title="Show only Open (unacknowledged) alerts"
          />
          Only unacknowledged (open alerts)
        </label>
      </div>

      {/* Active filter chips */}
      {(severityFilter !== 'all' || statusFilter !== 'all' || programFilter !== 'all' || unacknowledgedOnly) && (
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
          {programFilter !== 'all' && (
            <FilterTag
              label={`Program: ${programFilter}`}
              onRemove={() => setProgramFilter('all')}
            />
          )}
          {unacknowledgedOnly && (
            <FilterTag label="Only open alerts" onRemove={() => setUnacknowledgedOnly(false)} />
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setSeverityFilter('all');
              setStatusFilter('all');
              setProgramFilter('all');
              setUnacknowledgedOnly(false);
              setSearchQuery('');
            }}
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
            {openSelectedCount !== selectedIds.size ? (
              <span style={{ fontWeight: 500, opacity: 0.85 }}>
                {' '}
                · {openSelectedCount} open
              </span>
            ) : null}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={bulkActionLoading || openSelectedCount === 0}
              title={
                openSelectedCount === 0
                  ? 'Select rows that are still Open'
                  : 'Marks selected Open alerts as Acknowledged after you have actually contacted those members'
              }
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
                  Acknowledge ({openSelectedCount})
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
              header: (
                <span title="0–100 composite from the nightly risk job (logins, training, counselor contact, resume, etc.).">
                  Score
                </span>
              ),
              cell: (row) => <ScoreBadge score={row.score} />,
              width: 72,
              align: 'center',
            },
            {
              key: 'severity',
              header: (
                <span title="Bands: Critical ≥70, High ≥50, Medium ≥30, Low &lt;30. Matches the colored chips above.">
                  Severity
                </span>
              ),
              cell: (row) => <RiskBadge level={row.riskLevel} />,
              width: 120,
            },
            {
              key: 'member',
              header: (
                <span title="Click a member’s name to open their full profile and training history.">
                  Member
                </span>
              ),
              cell: (row) => (
                <div>
                  <button
                    type="button"
                    onClick={() => setDetailMember(row)}
                    style={{
                      fontWeight: 600,
                      color: 'inherit',
                      textDecoration: 'none',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {row.name}
                  </button>
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
              header: (
                <span title="Each pill is a weighted signal from last night’s scan; several can apply at once.">
                  Risk factors
                </span>
              ),
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
                      title={`${f.description} (weight ${f.weight}).`}
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
              header: (
                <span title="Member’s current enrolled catalog program (if any).">
                  Program
                </span>
              ),
              cell: (row) => (
                <span style={{ fontSize: '0.85rem' }}>
                  {row.enrolledProgram ?? 'Not enrolled'}
                </span>
              ),
              hideOnMobile: true,
            },
            {
              key: 'lastActivity',
              header: (
                <span title="Best-known activity time: portal events, Coursera sync, or join date—used to spot silent members.">
                  Last activity
                </span>
              ),
              cell: (row) => (
                <span style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'nowrap' }}>
                  {formatDate(row.lastActivityAt ?? row.memberSince)}
                </span>
              ),
              width: 110,
              hideOnMobile: true,
            },
            {
              key: 'status',
              header: (
                <span title="Open = needs triage. Acknowledged = outreach started. Resolved = case closed from a risk perspective.">
                  Status
                </span>
              ),
              cell: (row) => <StatusBadge label={STATUS_CONFIG[row.status].label} variant={STATUS_CONFIG[row.status].variant} />,
              width: 120,
            },
            {
              key: 'actions',
              header: (
                <span title="Ack: first touch logged. Resolve: situation stable. Message: open thread. View: full profile.">
                  Actions
                </span>
              ),
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
                        title="Mark that you have started outreach or taken ownership"
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
                        title="Close this alert when risk is cleared, member is placed/exited, or outcome documented"
                      >
                        {isActing ? <Loader2 size={12} className="wa-animate-spin" /> : 'Resolve'}
                      </button>
                    )}
                    <Link
                      href={`/counselor/students/${encodeURIComponent(row.userId)}#counselor-member-messages`}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      title="Open the counselor message thread with this member"
                    >
                      <MessageSquare size={12} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
                      Message
                    </Link>
                    <Link
                      href={`/counselor/students/${row.userId}`}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      title="Counselor student profile and history"
                    >
                      View
                    </Link>
                  </div>
                );
              },
              width: 268,
            },
          ]}
          rows={filteredMembers}
          rowKey={(row) => row.alertId}
          emptyState={
            <PortalEmptyState
              title="No at-risk members match your filters"
              description="Try adjusting severity or status filters, or check back after the next nightly risk scan."
              icon={<AlertTriangle size={32} style={{ color: 'var(--color-gold)' }} />}
              primaryAction={{
                label: 'Clear filters',
                href: '#',
                onClick: () => {
                  setSeverityFilter('all');
                  setStatusFilter('all');
                  setProgramFilter('all');
                  setUnacknowledgedOnly(false);
                  setSearchQuery('');
                },
              }}
            />
          }
          scrollX
        />
      </div>

      {/* Detail Modal */}
      {detailMember && (
        <AtRiskDetailModal
          member={detailMember}
          onClose={() => setDetailMember(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Mobile cards */}
      <div className="wa-block md:wa-hidden wa-flex wa-flex-col" style={{ gap: '0.75rem' }}>
        {filteredMembers.length === 0 ? (
          <PortalEmptyState
            title="No at-risk members match your filters"
            description="Try adjusting severity or status filters, or check back after the next nightly risk scan."
            icon={<AlertTriangle size={32} style={{ color: 'var(--color-gold)' }} />}
            primaryAction={{
              label: 'Clear filters',
              href: '#',
              onClick: () => {
                setSeverityFilter('all');
                setStatusFilter('all');
                setProgramFilter('all');
                setUnacknowledgedOnly(false);
                setSearchQuery('');
              },
            }}
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

function SortModeButton({
  active,
  onClick,
  title: tooltip,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      className={active ? 'btn btn-primary btn-sm' : 'btn btn-muted btn-sm'}
      style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
    >
      {children}
    </button>
  );
}

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
      title={SEVERITY_TOOLTIP[level]}
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
      title={STATUS_TOOLTIP[status]}
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
            title={`${f.description} (weight ${f.weight}).`}
          >
            {f.description}
          </span>
        ))}
      </div>

      <p
        style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}
        title="Latest portal activity signal: member events, Coursera sync, or account created date."
      >
        Last activity:{' '}
        <strong style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
          {formatDate(row.lastActivityAt ?? row.memberSince)}
        </strong>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span title={STATUS_TOOLTIP[row.status]}>
          <StatusBadge label={STATUS_CONFIG[row.status].label} variant={STATUS_CONFIG[row.status].variant} />
        </span>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          <Link
            href={`/counselor/students/${encodeURIComponent(row.userId)}#counselor-member-messages`}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            title="Open the counselor message thread with this member"
          >
            <MessageSquare size={12} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
            Message
          </Link>
          <Link
            href={`/counselor/students/${row.userId}`}
            className="btn btn-outline btn-sm"
            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            title="Counselor student profile and history"
          >
            View
          </Link>
          {row.status === 'open' && (
            <button
              type="button"
              className="btn btn-muted btn-sm"
              disabled={acting}
              onClick={onAcknowledge}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              title="Mark that you have started outreach or taken ownership"
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
              title="Close this alert when risk is cleared, member is placed/exited, or outcome documented"
            >
              {acting ? <Loader2 size={12} className="wa-animate-spin" /> : 'Resolve'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
