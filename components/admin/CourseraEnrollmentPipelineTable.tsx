'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import DataTable from '@/components/portal/ui/DataTable';
import StatusBadge from '@/components/portal/StatusBadge';
import type { BadgeVariant } from '@/components/portal/StatusBadge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import type { EnrollmentPipelineRow, EnrollmentSignal } from '@/lib/admin/courseraEnrollmentPipeline';

const SIGNAL_CONFIG: Record<EnrollmentSignal, { label: string; variant: BadgeVariant }> = {
  not_approved: { label: 'Not approved', variant: 'neutral' },
  approved_not_started: { label: 'Approved — not started', variant: 'warning' },
  active: { label: 'Active', variant: 'success' },
  stalled: { label: 'Stalled', variant: 'error' },
  completed: { label: 'Completed', variant: 'accent' },
};

function fmtDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

type EnrollResult = { ok: boolean; text: string };

export default function CourseraEnrollmentPipelineTable({
  initialRows,
  programs,
}: {
  initialRows: EnrollmentPipelineRow[];
  programs: Array<{ slug: string; title: string }>;
}) {
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [programFilter, setProgramFilter] = useState<string>('all');
  const [signalFilter, setSignalFilter] = useState<'all' | EnrollmentSignal>('all');
  const [search, setSearch] = useState('');

  const [approvePendingId, setApprovePendingId] = useState<string | null>(null);
  const [confirmApproveRow, setConfirmApproveRow] = useState<EnrollmentPipelineRow | null>(null);
  const [confirmEnrollRow, setConfirmEnrollRow] = useState<EnrollmentPipelineRow | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, EnrollResult>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  async function refresh() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/coursera/enrollment-pipeline');
      if (!res.ok) throw new Error(`Refresh failed (${res.status})`);
      const data = (await res.json()) as { rows: EnrollmentPipelineRow[] };
      setRows(data.rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not refresh the pipeline.');
    } finally {
      setLoading(false);
    }
  }

  async function submitApprove(row: EnrollmentPipelineRow, next: boolean) {
    setApprovePendingId(row.memberId);
    setRowErrors((prev) => ({ ...prev, [row.memberId]: '' }));
    try {
      const res = await fetch(
        `/api/admin/members/${encodeURIComponent(row.memberId)}/coursera-enrollment-approval`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: next }),
        },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        setRowErrors((prev) => ({ ...prev, [row.memberId]: payload.error ?? 'Could not update. Please try again.' }));
        return;
      }
      await refresh();
    } catch {
      setRowErrors((prev) => ({ ...prev, [row.memberId]: 'Could not reach the server.' }));
    } finally {
      setApprovePendingId(null);
      setConfirmApproveRow(null);
    }
  }

  function handleApproveToggle(row: EnrollmentPipelineRow) {
    if (!row.approved) {
      // Granting approval spends a seat the first time the member enrolls —
      // confirm once, same guardrail as the member-detail toggle.
      setConfirmApproveRow(row);
      return;
    }
    void submitApprove(row, false);
  }

  async function enrollNow(row: EnrollmentPipelineRow) {
    setEnrollingId(row.memberId);
    setRowMessages((prev) => {
      const next = { ...prev };
      delete next[row.memberId];
      return next;
    });
    try {
      const res = await fetch('/api/admin/coursera/enroll-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: row.memberId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        courseName?: string;
        error?: string;
      };
      if (!res.ok) {
        setRowMessages((prev) => ({
          ...prev,
          [row.memberId]: { ok: false, text: payload.error ?? 'Enrollment failed. Try again.' },
        }));
        return;
      }
      const text =
        payload.status === 'invited'
          ? `Invite sent — ${row.memberName} will get an email to join, then courses unlock.`
          : payload.status === 'already-enrolled'
            ? `Already enrolled${payload.courseName ? ` in ${payload.courseName}` : ''}.`
            : `Enrolled${payload.courseName ? ` in ${payload.courseName}` : ''}.`;
      setRowMessages((prev) => ({ ...prev, [row.memberId]: { ok: true, text } }));
      await refresh();
    } catch {
      setRowMessages((prev) => ({ ...prev, [row.memberId]: { ok: false, text: 'Could not reach the server.' } }));
    } finally {
      setEnrollingId(null);
      setConfirmEnrollRow(null);
    }
  }

  const filteredRows = useMemo(() => {
    let list = rows;
    if (programFilter !== 'all') list = list.filter((r) => r.programSlug === programFilter);
    if (signalFilter !== 'all') list = list.filter((r) => r.signal === signalFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) => r.memberName.toLowerCase().includes(q) || r.memberEmail.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, programFilter, signalFilter, search]);

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
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          aria-label="Filter by program"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-high)',
            color: 'inherit',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">All programs</option>
          {programs.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
        <select
          value={signalFilter}
          onChange={(e) => setSignalFilter(e.target.value as 'all' | EnrollmentSignal)}
          aria-label="Filter by enrollment signal"
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-high)',
            color: 'inherit',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">All signals</option>
          {(Object.keys(SIGNAL_CONFIG) as EnrollmentSignal[]).map((s) => (
            <option key={s} value={s}>
              {SIGNAL_CONFIG[s].label}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-muted btn-sm" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loadError ? (
        <p role="alert" style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-accent)' }}>
          {loadError}
        </p>
      ) : null}

      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
        Showing {filteredRows.length} of {rows.length} member{rows.length === 1 ? '' : 's'}
      </p>

      <DataTable
        density="compact"
        rows={filteredRows}
        rowKey={(row) => row.memberId}
        emptyState={
          <div style={{ padding: '1rem', display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
            <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>
              No members match the current search / program / signal filters.
            </p>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setSearch('');
                setProgramFilter('all');
                setSignalFilter('all');
              }}
            >
              Clear filters
            </button>
          </div>
        }
        columns={[
          {
            key: 'member',
            header: 'Member',
            cell: (row) => (
              <>
                <Link href={`/admin/members/${row.memberId}`} style={{ fontWeight: 600 }}>
                  {row.memberName}
                </Link>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>{row.memberEmail}</div>
              </>
            ),
          },
          {
            key: 'program',
            header: 'Program',
            cell: (row) => row.programTitle,
          },
          {
            key: 'approved',
            header: 'Approved?',
            cell: (row) => (
              <div>
                <span style={{ fontWeight: 600, color: row.approved ? 'var(--color-green, #16a34a)' : 'var(--color-on-surface-variant)' }}>
                  {row.approved ? 'Yes' : 'No'}
                </span>
                {row.approved && row.approvedAt ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                    {fmtDateTime(row.approvedAt)}
                    {row.approvedByName ? ` by ${row.approvedByName}` : ''}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: 'signal',
            header: 'Enrollment signal',
            cell: (row) => (
              <div>
                <StatusBadge label={SIGNAL_CONFIG[row.signal].label} variant={SIGNAL_CONFIG[row.signal].variant} />
                {row.lastActivityAt ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                    last activity {fmtDateTime(row.lastActivityAt)}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            cell: (row) => {
              const isApprovePending = approvePendingId === row.memberId;
              const isEnrolling = enrollingId === row.memberId;
              const message = rowMessages[row.memberId];
              const error = rowErrors[row.memberId];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '10rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={row.approved ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm'}
                      disabled={isApprovePending}
                      onClick={() => handleApproveToggle(row)}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      {isApprovePending ? 'Working…' : row.approved ? 'Revoke' : 'Approve'}
                    </button>
                    {row.approved ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={isEnrolling}
                        onClick={() => setConfirmEnrollRow(row)}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      >
                        {isEnrolling ? 'Enrolling…' : 'Enroll now'}
                      </button>
                    ) : null}
                  </div>
                  {message ? (
                    <span
                      role={message.ok ? 'status' : 'alert'}
                      style={{ fontSize: '0.75rem', color: message.ok ? 'var(--color-success, #166534)' : 'var(--color-error, #c83232)' }}
                    >
                      {message.text}
                    </span>
                  ) : null}
                  {error ? (
                    <span role="alert" style={{ fontSize: '0.75rem', color: 'var(--color-error, #c83232)' }}>
                      {error}
                    </span>
                  ) : null}
                </div>
              );
            },
          },
        ]}
      />

      <ConfirmDialog
        open={confirmApproveRow != null}
        title="Approve Coursera enrollment?"
        body={
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'pre-line' }}>
            {`Approve ${confirmApproveRow?.memberName ?? 'this member'} for Coursera enrollment?\n\nThis lets them self-enroll in their assigned program's courses. Each enrollment uses a paid Coursera seat. Only approve once funding is confirmed and a counselor has assigned a program.`}
          </p>
        }
        confirmLabel="Approve"
        busy={approvePendingId === confirmApproveRow?.memberId}
        onConfirm={() => {
          if (confirmApproveRow) void submitApprove(confirmApproveRow, true);
        }}
        onCancel={() => setConfirmApproveRow(null)}
      />
      <ConfirmDialog
        open={confirmEnrollRow != null}
        title="Enroll this member in Coursera now?"
        body={
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', whiteSpace: 'pre-line' }}>
            {`Enroll ${confirmEnrollRow?.memberName ?? 'this member'} in their assigned program's first course?\n\nIf they're not on Coursera yet, this sends the program invite (they'll get an email). Enrollment uses a paid Coursera seat and is recorded in the audit log.`}
          </p>
        }
        confirmLabel="Enroll now"
        busy={enrollingId === confirmEnrollRow?.memberId}
        onConfirm={() => {
          if (confirmEnrollRow) void enrollNow(confirmEnrollRow);
        }}
        onCancel={() => setConfirmEnrollRow(null)}
      />
    </div>
  );
}
