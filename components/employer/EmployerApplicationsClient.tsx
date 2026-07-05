'use client';

import { Fragment, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { JobPostingApplicationStatus } from '@prisma/client';
import { Filter, ArrowUpDown, Info, MessageSquare } from 'lucide-react';
import EmployerApplicationChatClient from '@/components/portal/EmployerApplicationChatClient';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { employerApplicationsListHref, type EmployerApplicationsSort } from '@/lib/employer/employerApplicationsListQuery';
import { employerJobPostingApplicationStatusLabel } from '@/lib/employer/jobPostingApplicationStatus';
import { DesignSurface, Avatar, StatusTag, StageTrack, type KitColor, type KitTone } from '@/components/portal/kit';

/**
 * Employer applicants table — Command Center visual language.
 *
 * Built directly on the `.wa-kit-table` classes (rather than the shared
 * `<DataTable>` primitive) because this view needs two things the simple kit
 * table doesn't support: a "select all" checkbox baked into the header cell,
 * and an inline chat sub-row that expands under a selected applicant. Reskin
 * only — every handler, request shape, and prop contract is unchanged.
 */

export type AppMsg = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  isFromEmployer: boolean;
};

export type EmployerApplicationRow = {
  id: string;
  jobId: string;
  status: string;
  appliedAt: string;
  employerNotes: string | null;
  job: { id: string; title: string };
  student: { id: string; fullName: string | null; email: string };
};

const STATUSES = ['pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected'] as const satisfies readonly JobPostingApplicationStatus[];

const FILTER_CHIPS: { label: string; value: JobPostingApplicationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'pending' },
  { label: 'Reviewing', value: 'reviewing' },
  { label: 'Interview', value: 'interview' },
  { label: 'Offer', value: 'offered' },
  { label: 'Hired', value: 'hired' },
  { label: 'Declined', value: 'rejected' },
];

/** Same convention as EmployerHomeKit's candidate table, applied here for a consistent portal-wide read. */
function statusTagTone(status: string): KitTone {
  const s = status.toLowerCase();
  if (s === 'hired') return 'ok';
  if (s === 'rejected') return 'alert';
  if (s === 'offered' || s === 'interview') return 'info';
  if (s === 'reviewing') return 'warn';
  return 'muted'; // pending
}

/** Applied → Screen → Interview → Offer/Hired (4-stage tracker); mirrors EmployerHomeKit. */
function stageForStatus(status: string): { index: number; total: number; color: KitColor } {
  const s = status.toLowerCase();
  if (s === 'hired' || s === 'offered') return { index: 4, total: 4, color: 'success' };
  if (s === 'interview') return { index: 3, total: 4, color: 'gold' };
  if (s === 'reviewing') return { index: 2, total: 4, color: 'info' };
  return { index: 1, total: 4, color: 'muted' }; // pending / rejected
}

function initialsFor(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const NUM_COLS = 6;

function Pill({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 13px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        textDecoration: 'none',
        border: '1px solid var(--wa-border)',
        background: active ? 'var(--wa-accent)' : 'var(--wa-surface)',
        borderColor: active ? 'var(--wa-accent)' : 'var(--wa-border)',
        color: active ? 'var(--wa-on-accent)' : 'var(--wa-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 'var(--wa-radius-sm)',
  border: '1px solid var(--wa-border)',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
  fontSize: 12,
  fontWeight: 600,
  minHeight: 32,
};

export default function EmployerApplicationsClient({
  initialRows,
  activeStatusFilter,
  activeSort,
}: {
  initialRows: EmployerApplicationRow[];
  activeStatusFilter: JobPostingApplicationStatus | null;
  activeSort: EmployerApplicationsSort;
}) {
  const [rows, setRows] = useState(initialRows);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<JobPostingApplicationStatus>('reviewing');
  const [openChatId, setOpenChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, AppMsg[]>>({});
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows(initialRows);
    setSelected(new Set());
  }, [initialRows]);

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAllVisible = useCallback(() => {
    const ids = rows.map((r) => r.id);
    const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
    if (allSel) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(ids));
  }, [rows, selected]);

  const patchStatus = useCallback(async (id: string, status: string) => {
    setBusyId(id);
    setError(null);
    try {
      const r = await fetch(`/api/employer/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Update failed');
        return false;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                status: data.status ?? status,
                employerNotes: data.employerNotes ?? row.employerNotes,
              }
            : row
        )
      );
      return true;
    } finally {
      setBusyId(null);
    }
  }, []);

  const applyBulkStatus = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      for (const id of ids) {
        const worked = await patchStatus(id, bulkStatus);
        if (!worked) return;
      }
      setSelected(new Set());
    } finally {
      setBulkBusy(false);
    }
  }, [bulkStatus, patchStatus, selected]);

  const toggleChat = useCallback(
    async (applicationId: string) => {
      if (openChatId === applicationId) {
        setOpenChatId(null);
        return;
      }

      setError(null);

      if (!chatMessages[applicationId]) {
        setChatLoadingId(applicationId);
        try {
          const r = await fetch(`/api/employer/applications/${applicationId}/messages`, {
            credentials: 'include',
          });
          const data = await r.json().catch(() => ({}));
          if (!r.ok) {
            setError(typeof data.error === 'string' ? data.error : 'Unable to load messages');
            return;
          }
          setChatMessages((prev) => ({ ...prev, [applicationId]: Array.isArray(data.messages) ? data.messages : [] }));
        } catch {
          setError('Unable to load messages');
          return;
        } finally {
          setChatLoadingId(null);
        }
      }

      setOpenChatId(applicationId);
    },
    [chatMessages, openChatId]
  );

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selected.has(id)) && !allVisibleSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someVisibleSelected;
  }, [someVisibleSelected, rows]);

  const toolbar = (
    <div className="wa-kit-card wa-kit-card--sm" role="search" aria-label="Filter applicants by hiring stage">
      <div className="wa-flex wa-flex-wrap wa-items-start wa-justify-between wa-gap-4">
        <div style={{ minWidth: 0 }}>
          <div className="wa-flex wa-items-center wa-gap-1 wa-kit-stat-label" style={{ marginBottom: 8 }}>
            <Filter size={11} aria-hidden /> Pipeline stage
          </div>
          <div className="wa-flex wa-flex-wrap wa-gap-2">
            {FILTER_CHIPS.map((chip) => {
              const isActive = chip.value === 'all' ? activeStatusFilter == null : activeStatusFilter === chip.value;
              return (
                <Pill
                  key={chip.label}
                  active={isActive}
                  href={employerApplicationsListHref({
                    page: 1,
                    status: chip.value === 'all' ? null : chip.value,
                    sort: activeSort,
                  })}
                >
                  {chip.label}
                </Pill>
              );
            })}
          </div>
        </div>
        <div>
          <div className="wa-flex wa-items-center wa-gap-1 wa-kit-stat-label" style={{ marginBottom: 8 }}>
            <ArrowUpDown size={11} aria-hidden /> Sort by applied date
          </div>
          <div className="wa-flex wa-gap-2">
            <Pill
              active={activeSort === 'applied_desc'}
              href={employerApplicationsListHref({ page: 1, status: activeStatusFilter ?? undefined, sort: 'applied_desc' })}
            >
              Newest
            </Pill>
            <Pill
              active={activeSort === 'applied_asc'}
              href={employerApplicationsListHref({ page: 1, status: activeStatusFilter ?? undefined, sort: 'applied_asc' })}
            >
              Oldest
            </Pill>
          </div>
        </div>
      </div>
    </div>
  );

  if (rows.length === 0) {
    const filtered = !!activeStatusFilter;
    return (
      <DesignSurface surface="dense" className="wa-space-y-4">
        {toolbar}
        <PortalEmptyState
          title={filtered ? 'No applicants match this filter' : 'No applications yet'}
          description={
            filtered
              ? 'Adjust the pipeline filter above or reset to view all applicants in your funnel.'
              : 'When candidates apply to your jobs, they will appear here with status and messaging.'
          }
          icon={<span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-on-surface-variant)' }} aria-hidden>badge</span>}
          primaryAction={
            filtered
              ? { label: 'Show all applicants', href: employerApplicationsListHref({ sort: activeSort }) }
              : { label: 'Post a role', href: '/employer/jobs/new' }
          }
        />
      </DesignSurface>
    );
  }

  return (
    <DesignSurface surface="dense" className="wa-space-y-4">
      {toolbar}
      <div
        className="wa-flex wa-items-start wa-gap-2"
        style={{
          padding: '10px 14px',
          borderRadius: 'var(--wa-radius-sm)',
          background: 'var(--wa-info-soft)',
          fontSize: 12,
          color: 'var(--wa-text)',
        }}
      >
        <Info size={14} aria-hidden style={{ color: 'var(--wa-info)', flexShrink: 0, marginTop: 1 }} />
        Select rows to update several candidates at once. Prefer the row dropdown for precise one-off edits.
      </div>

      {selected.size > 0 ? (
        <div
          className="wa-kit-card wa-kit-card--sm wa-flex wa-flex-wrap wa-items-center wa-justify-between wa-gap-3"
          role="region"
          aria-label="Bulk update pipeline stages"
        >
          <div className="wa-flex wa-items-center wa-gap-2" style={{ fontSize: 12.5 }}>
            <span
              style={{
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
                color: 'var(--wa-accent)',
                background: 'var(--wa-accent-soft)',
                borderRadius: 999,
                padding: '2px 9px',
              }}
            >
              {selected.size}
            </span>
            <span style={{ color: 'var(--wa-muted)' }}>selected · set stage for all selected applicants</span>
          </div>
          <div className="wa-flex wa-items-center wa-gap-2">
            <label className="wa-sr-only" htmlFor="employer-apps-bulk-status">
              Bulk status
            </label>
            <select
              id="employer-apps-bulk-status"
              style={selectStyle}
              value={bulkStatus}
              disabled={bulkBusy}
              onChange={(e) => setBulkStatus(e.target.value as JobPostingApplicationStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {employerJobPostingApplicationStatusLabel(s)}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-primary btn-sm" disabled={bulkBusy} onClick={() => void applyBulkStatus()}>
              {bulkBusy ? 'Updating…' : 'Apply stage'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--wa-danger)', margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div className="wa-kit-table-wrap">
        <div className="wa-overflow-x-auto">
          <table className="wa-kit-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th scope="col">
                  <div className="wa-flex wa-items-center wa-gap-2">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      aria-label="Select every applicant visible on this page"
                      style={{ width: 14, height: 14, accentColor: 'var(--wa-accent)' }}
                    />
                    <span>Candidate</span>
                  </div>
                </th>
                <th scope="col">Job</th>
                <th scope="col">Pipeline</th>
                <th scope="col">Update</th>
                <th scope="col" style={{ textAlign: 'right' }}>Applied</th>
                <th scope="col" style={{ textAlign: 'center' }}>Contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((app) => {
                const studentName = app.student.fullName?.trim() || app.student.email;
                const checked = selected.has(app.id);
                const isChatOpen = openChatId === app.id;
                const isChatLoading = chatLoadingId === app.id;
                const stage = stageForStatus(app.status);
                return (
                  <Fragment key={app.id}>
                    <tr>
                      <td>
                        <div className="wa-flex wa-items-center wa-gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busyId === app.id}
                            onChange={(e) => toggleOne(app.id, e.target.checked)}
                            aria-label={`Select applicant ${studentName}`}
                            style={{ width: 14, height: 14, accentColor: 'var(--wa-accent)', flexShrink: 0 }}
                          />
                          <Avatar initials={initialsFor(studentName)} size={30} />
                          <div style={{ minWidth: 0 }}>
                            <Link
                              href={`/employer/candidates/${app.student.id}?jobId=${encodeURIComponent(app.jobId)}`}
                              style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--wa-text)', textDecoration: 'none' }}
                            >
                              {studentName}
                            </Link>
                            <div style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{app.student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Link href={`/employer/jobs/${app.job.id}`} style={{ color: 'var(--wa-accent)', fontWeight: 600, textDecoration: 'none' }}>
                          {app.job.title}
                        </Link>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <StatusTag tone={statusTagTone(app.status)}>{employerJobPostingApplicationStatusLabel(app.status)}</StatusTag>
                          {app.status !== 'rejected' && <StageTrack index={stage.index} total={stage.total} color={stage.color} width={64} />}
                        </div>
                      </td>
                      <td>
                        <select
                          style={selectStyle}
                          value={app.status}
                          disabled={busyId === app.id}
                          onChange={(e) => void patchStatus(app.id, e.target.value)}
                          aria-label={`Pipeline stage for ${studentName}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {employerJobPostingApplicationStatusLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <time dateTime={app.appliedAt} style={{ color: 'var(--wa-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(app.appliedAt).toLocaleDateString()}
                        </time>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="wa-kit-focus"
                          onClick={() => void toggleChat(app.id)}
                          disabled={isChatLoading}
                          aria-expanded={isChatOpen}
                          aria-controls={`employer-chat-${app.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '5px 11px',
                            borderRadius: 999,
                            border: '1px solid var(--wa-border)',
                            background: isChatOpen ? 'var(--wa-accent)' : 'var(--wa-surface)',
                            color: isChatOpen ? 'var(--wa-on-accent)' : 'var(--wa-text)',
                            cursor: 'pointer',
                          }}
                        >
                          <MessageSquare size={12} aria-hidden />
                          {isChatLoading ? '…' : isChatOpen ? 'Close' : 'Message'}
                        </button>
                      </td>
                    </tr>
                    {isChatOpen && (
                      <tr>
                        <td colSpan={NUM_COLS} style={{ padding: '0 0 1rem', verticalAlign: 'top' }}>
                          <div
                            id={`employer-chat-${app.id}`}
                            style={{
                              border: '1px solid var(--wa-border)',
                              borderRadius: 'var(--wa-radius-sm)',
                              overflow: 'hidden',
                              background: 'var(--wa-bg)',
                              minHeight: '28rem',
                            }}
                          >
                            <EmployerApplicationChatClient
                              applicationId={app.id}
                              studentName={studentName}
                              jobTitle={app.job.title}
                              initialMessages={chatMessages[app.id] ?? []}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DesignSurface>
  );
}
