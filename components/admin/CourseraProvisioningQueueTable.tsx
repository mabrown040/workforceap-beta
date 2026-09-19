'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import DataTable from '@/components/portal/ui/DataTable';
import StatusBadge from '@/components/portal/StatusBadge';
import type { BadgeVariant } from '@/components/portal/StatusBadge';
import {
  buildProvisioningCsv,
  PROVISIONING_STATE_HINTS,
  PROVISIONING_STATE_LABELS,
  PROVISIONING_STATES,
  type CourseraProvisioningRow,
  type CourseraProvisioningState,
} from '@/lib/coursera/provisioningState';

const STATE_VARIANT: Record<CourseraProvisioningState, BadgeVariant> = {
  not_provisioned: 'warning',
  invited: 'info',
  unmatched: 'error',
  enrolled_not_started: 'info',
  stalled: 'error',
  active: 'success',
  completed: 'accent',
  not_approved: 'neutral',
};

const STATE_ORDER = new Map<CourseraProvisioningState, number>(
  PROVISIONING_STATES.map((state, index) => [state, index]),
);

type AttentionFilter = 'all' | 'attention';

function fmtDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
}

function downloadCsv(rows: CourseraProvisioningRow[]) {
  const csv = buildProvisioningCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coursera-provisioning-${rows.length}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const controlStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--outline-variant)',
  background: 'var(--surface-container-high)',
  color: 'inherit',
  fontSize: '0.85rem',
} as const;

export default function CourseraProvisioningQueueTable({
  rows,
  programs,
  generatedAt,
}: {
  rows: CourseraProvisioningRow[];
  programs: Array<{ slug: string; title: string }>;
  generatedAt: string;
}) {
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<'all' | CourseraProvisioningState>('all');
  const [attentionFilter, setAttentionFilter] = useState<AttentionFilter>('all');
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    let list = rows;
    if (programFilter !== 'all') list = list.filter((r) => r.programSlug === programFilter);
    if (stateFilter !== 'all') list = list.filter((r) => r.state === stateFilter);
    if (attentionFilter === 'attention') list = list.filter((r) => r.needsAttention);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.memberName.toLowerCase().includes(q) || r.memberEmail.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (a.needsAttention !== b.needsAttention) return a.needsAttention ? -1 : 1;
      const order = (STATE_ORDER.get(a.state) ?? 0) - (STATE_ORDER.get(b.state) ?? 0);
      if (order !== 0) return order;
      return a.memberName.localeCompare(b.memberName);
    });
  }, [rows, programFilter, stateFilter, attentionFilter, search]);

  const hasFilters = programFilter !== 'all' || stateFilter !== 'all' || attentionFilter !== 'all' || search !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div
        className="content-card"
        style={{ padding: '0.75rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          aria-label="Search by name or email"
          style={{ ...controlStyle, flex: 1, minWidth: '12rem' }}
        />
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          aria-label="Filter by program"
          style={controlStyle}
        >
          <option value="all">All programs</option>
          {programs.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as 'all' | CourseraProvisioningState)}
          aria-label="Filter by Coursera state"
          style={controlStyle}
        >
          <option value="all">All states</option>
          {PROVISIONING_STATES.map((s) => (
            <option key={s} value={s}>
              {PROVISIONING_STATE_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={attentionFilter}
          onChange={(e) => setAttentionFilter(e.target.value as AttentionFilter)}
          aria-label="Filter by attention"
          style={controlStyle}
        >
          <option value="all">Everyone</option>
          <option value="attention">Needs attention only</option>
        </select>
        <button
          type="button"
          className="btn btn-muted btn-sm"
          onClick={() => downloadCsv(filteredRows)}
          disabled={filteredRows.length === 0}
        >
          Export CSV ({filteredRows.length})
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
        Showing {filteredRows.length} of {rows.length} member{rows.length === 1 ? '' : 's'} · snapshot{' '}
        {new Date(generatedAt).toLocaleString()} · rows needing attention sort first.
      </p>

      <DataTable
        rows={filteredRows}
        rowKey={(row) => row.memberId}
        variant="admin"
        density="compact"
        emptyState={
          <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
            <span>No members match the current filters.</span>
            {hasFilters ? (
              <button
                type="button"
                className="btn btn-muted btn-sm"
                onClick={() => {
                  setProgramFilter('all');
                  setStateFilter('all');
                  setAttentionFilter('all');
                  setSearch('');
                }}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        }
        columns={[
          {
            key: 'member',
            header: 'Member',
            rowHeader: true,
            cell: (row) => (
              <div style={{ minWidth: 0 }}>
                <Link href={`/admin/members/${row.memberId}`} style={{ fontWeight: 600 }}>
                  {row.memberName}
                </Link>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.memberEmail}</div>
              </div>
            ),
          },
          {
            key: 'program',
            header: 'Program',
            cell: (row) => row.programTitle,
          },
          {
            key: 'state',
            header: 'Coursera state',
            cell: (row) => (
              <div style={{ display: 'grid', gap: '0.25rem', justifyItems: 'start' }}>
                <span title={PROVISIONING_STATE_HINTS[row.state]}>
                  <StatusBadge label={PROVISIONING_STATE_LABELS[row.state]} variant={STATE_VARIANT[row.state]} />
                </span>
                {row.approvalMismatch ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                    Coursera activity without portal approval
                  </span>
                ) : null}
                {row.hasUnmatchedRows ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>
                    {row.unmatchedCourseraRows} unlinked Coursera row{row.unmatchedCourseraRows === 1 ? '' : 's'}
                  </span>
                ) : null}
              </div>
            ),
          },
          {
            key: 'approved',
            header: 'Seat approved',
            hideOnMobile: true,
            cell: (row) => (
              <div>
                <span style={{ fontWeight: 600 }}>{row.approved ? 'Yes' : 'No'}</span>
                {row.approved && row.approvedAt ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>{fmtDate(row.approvedAt)}</div>
                ) : null}
              </div>
            ),
          },
          {
            key: 'invited',
            header: 'Invited',
            hideOnMobile: true,
            cell: (row) => fmtDate(row.invitedAt),
          },
          {
            key: 'enrolled',
            header: 'Enrolled on Coursera',
            hideOnMobile: true,
            cell: (row) => fmtDate(row.enrolledAt),
          },
          {
            key: 'activity',
            header: 'Last activity',
            cell: (row) => (
              <div>
                <div>{fmtDate(row.lastActivityAt)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                  {row.courseProgressRows} course · {row.linkedCourseraRows} B4B · {row.xapiStatements} xAPI
                </div>
              </div>
            ),
          },
          {
            key: 'actions',
            header: 'Open',
            align: 'right',
            cell: (row) => (
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Link href={`/admin/members/${row.memberId}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Member
                </Link>
                <Link href={`/admin/coursera/learners/${row.memberId}`} style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Coursera detail
                </Link>
                {row.state === 'unmatched' || row.hasUnmatchedRows ? (
                  <Link
                    href={`/admin/coursera/learners/unmatched/${encodeURIComponent(row.memberEmail.toLowerCase())}`}
                    style={{ fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Map rows
                  </Link>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
