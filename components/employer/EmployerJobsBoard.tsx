'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useId, useCallback, type RefObject } from 'react';
import { trackEmployerJobAction, trackEmployerBulkDelete } from '@/lib/analytics/events';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export type EmployerJobBoardItem = {
  id: string;
  title: string;
  location: string;
  descriptionPreview: string;
  status: string;
  statusLabel: string;
  applicationsCount: number;
  updatedAt: Date;
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'live', label: 'Live' },
  { value: 'filled', label: 'Filled' },
] as const;

function statusModifier(status: string): string {
  if (status === 'live') return 'employer-job-card__status--live';
  if (status === 'pending' || status === 'approved') return 'employer-job-card__status--pending';
  if (status === 'draft') return 'employer-job-card__status--draft';
  return 'employer-job-card__status--neutral';
}

function canBulkDelete(status: string): boolean {
  return status === 'draft' || status === 'pending' || status === 'filled' || status === 'closed';
}

const BULK_DELETE_FLASH_KEY = 'wfap_employer_bulk_delete_ok';

export default function EmployerJobsBoard({ jobs }: { jobs: EmployerJobBoardItem[] }) {
  const router = useRouter();
  const modalTitleId = useId();
  const modalDescId = useId();
  const modalPendingNoteId = useId();
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [flashBanner, setFlashBanner] = useState<{ count: number } | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return jobs;
    if (filter === 'filled') return jobs.filter((j) => j.status === 'filled' || j.status === 'closed');
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const deletableFiltered = useMemo(
    () => filtered.filter((j) => canBulkDelete(j.status)),
    [filtered]
  );

  const selectedDeletable = useMemo(
    () => [...selected].filter((id) => deletableFiltered.some((j) => j.id === id)),
    [selected, deletableFiltered]
  );

  const bulkDeleteIncludesPendingReview = useMemo(
    () =>
      selectedDeletable.some((id) => {
        const job = jobs.find((j) => j.id === id);
        return job?.status === 'pending';
      }),
    [selectedDeletable, jobs]
  );

  useEffect(() => {
    setSelected(new Set());
  }, [filter]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BULK_DELETE_FLASH_KEY);
      if (!raw) return;
      sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
      const parsed = JSON.parse(raw) as { count?: unknown };
      const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
      if (count != null) setFlashBanner({ count });
    } catch {
      try {
        sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const modalTrapRef = useFocusTrap(confirmOpen, () => setConfirmOpen(false));

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const selectAllDeletable = useCallback(() => {
    setSelected(new Set(deletableFiltered.map((j) => j.id)));
  }, [deletableFiltered]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  async function submitForReview(id: string, jobStatus: string) {
    setBusyId(id);
    trackEmployerJobAction('submit_review', id, { status: jobStatus });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Could not submit for review');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const handleClose = async (id: string, status: string) => {
    if (!confirm('Mark this job as filled/closed?')) return;
    setClosingId(id);
    trackEmployerJobAction('close_job', id, { status });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'filled' }),
      });
      if (res.ok) router.refresh();
      else alert('Failed to update');
    } finally {
      setClosingId(null);
    }
  };

  const openConfirm = () => {
    if (selectedDeletable.length === 0) return;
    setBulkError(null);
    setConfirmOpen(true);
  };

  const runBulkDelete = async () => {
    if (selectedDeletable.length === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch('/api/employer/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDeletable }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkError(typeof data.error === 'string' ? data.error : 'Could not delete selected jobs.');
        return;
      }
      const deletedCount = typeof data.deleted === 'number' ? data.deleted : selectedDeletable.length;
      trackEmployerBulkDelete(deletedCount, {
        filter,
      });
      try {
        sessionStorage.setItem(BULK_DELETE_FLASH_KEY, JSON.stringify({ count: deletedCount }));
      } catch {
        /* ignore quota / private mode */
      }
      setConfirmOpen(false);
      clearSelection();
      router.refresh();
      queueMicrotask(() => {
        try {
          const raw = sessionStorage.getItem(BULK_DELETE_FLASH_KEY);
          if (!raw) return;
          sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
          const parsed = JSON.parse(raw) as { count?: unknown };
          const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
          if (count != null) setFlashBanner({ count });
        } catch {
          try {
            sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
          } catch {
            /* ignore */
          }
        }
      });
    } catch {
      setBulkError('Network error. Check your connection and try again.');
    } finally {
      setBulkBusy(false);
    }
  };

  const allDeletableSelected =
    deletableFiltered.length > 0 && deletableFiltered.every((j) => selected.has(j.id));

  const counts = useMemo(() => {
    const c = { draft: 0, pending: 0, live: 0, filled: 0 };
    for (const j of jobs) {
      if (j.status === 'draft') c.draft += 1;
      else if (j.status === 'pending' || j.status === 'approved') c.pending += 1;
      else if (j.status === 'live') c.live += 1;
      else if (j.status === 'filled' || j.status === 'closed') c.filled += 1;
    }
    return c;
  }, [jobs]);

  return (
    <div className="employer-jobs-board">
      {flashBanner && (
        <div className="employer-jobs-flash-banner" role="status">
          <p className="employer-jobs-flash-banner__text">
            Deleted <strong>{flashBanner.count}</strong> posting{flashBanner.count === 1 ? '' : 's'}.
          </p>
          <button
            type="button"
            className="btn btn-ghost btn-sm employer-jobs-flash-banner__dismiss"
            onClick={() => setFlashBanner(null)}
            aria-label="Dismiss confirmation"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="employer-jobs-board__summary" aria-label="Posting counts">
        <span>
          <strong>{counts.draft}</strong> draft{counts.draft === 1 ? '' : 's'}
        </span>
        <span className="employer-jobs-board__summary-sep" aria-hidden="true">
          ·
        </span>
        <span>
          <strong>{counts.pending}</strong> in review
        </span>
        <span className="employer-jobs-board__summary-sep" aria-hidden="true">
          ·
        </span>
        <span>
          <strong>{counts.live}</strong> live
        </span>
        <span className="employer-jobs-board__summary-sep" aria-hidden="true">
          ·
        </span>
        <span>
          <strong>{counts.filled}</strong> filled
        </span>
      </div>

      <div className="employer-jobs-board__filters" role="toolbar" aria-label="Filter job postings">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`employer-jobs-board__filter ${filter === f.value ? 'is-active' : ''}`}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {deletableFiltered.length > 0 && (
        <div
          className="employer-jobs-board__bulk-bar"
          role="region"
          aria-label="Bulk actions for drafts, items in review, and closed postings"
        >
          <p className="employer-jobs-board__bulk-count" aria-live="polite">
            {selectedDeletable.length === 0 ? (
              <>No postings selected.</>
            ) : (
              <>
                <strong>{selectedDeletable.length}</strong> posting{selectedDeletable.length === 1 ? '' : 's'} selected
              </>
            )}
          </p>
          <div className="employer-jobs-board__bulk-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={selectAllDeletable} disabled={allDeletableSelected}>
              Select all in view
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection} disabled={selectedDeletable.length === 0}>
              Clear
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm employer-jobs-board__bulk-delete"
              disabled={selectedDeletable.length === 0 || bulkBusy}
              onClick={openConfirm}
            >
              Delete selected
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="employer-jobs-board__empty">No jobs match this filter.</p>
      ) : (
        <ul className="employer-jobs-board__grid" role="list">
          {filtered.map((j) => {
            const deletable = canBulkDelete(j.status);
            const checked = selected.has(j.id);
            return (
              <li key={j.id}>
                <article className="employer-job-card">
                  {deletable && (
                    <label className="employer-job-card__select">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleOne(j.id, e.target.checked)}
                        aria-label={`Select ${j.title} for bulk delete`}
                      />
                    </label>
                  )}
                  <div className="employer-job-card__top">
                    <span className={`employer-job-card__status ${statusModifier(j.status)}`}>{j.statusLabel}</span>
                    <time className="employer-job-card__time" dateTime={j.updatedAt.toISOString()}>
                      Updated {j.updatedAt.toLocaleDateString()}
                    </time>
                  </div>
                  <h2 className="employer-job-card__title">{j.title}</h2>
                  <p className="employer-job-card__meta">{j.location}</p>
                  <p className="employer-job-card__preview">{j.descriptionPreview}</p>
                  {j.status !== 'draft' && (
                    <p className="employer-job-card__apps">
                      <strong>{j.applicationsCount}</strong> application{j.applicationsCount === 1 ? '' : 's'}
                    </p>
                  )}
                  <div className="employer-job-card__actions">
                    <Link
                      href={`/employer/jobs/${j.id}`}
                      className="btn btn-primary btn-sm"
                      onClick={() => trackEmployerJobAction('edit', j.id, { status: j.status })}
                    >
                      {j.status === 'draft' ? 'Edit draft' : 'Edit posting'}
                    </Link>
                    {j.status === 'draft' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busyId === j.id}
                        onClick={() => submitForReview(j.id, j.status)}
                      >
                        {busyId === j.id ? 'Submitting…' : 'Submit for review'}
                      </button>
                    )}
                    {(j.status === 'live' || j.status === 'approved') && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={!!closingId}
                        onClick={() => handleClose(j.id, j.status)}
                      >
                        {closingId === j.id ? 'Updating…' : 'Mark filled'}
                      </button>
                    )}
                    {j.status !== 'draft' && (
                      <Link
                        href={`/employer/applications?jobId=${j.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={() => trackEmployerJobAction('view_applications', j.id, { status: j.status })}
                      >
                        View applications
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {confirmOpen && (
        <div className="employer-bulk-modal-overlay" role="presentation" onClick={() => !bulkBusy && setConfirmOpen(false)}>
          <div
            ref={modalTrapRef as RefObject<HTMLDivElement>}
            className="employer-bulk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={
              bulkDeleteIncludesPendingReview ? `${modalDescId} ${modalPendingNoteId}` : modalDescId
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={modalTitleId} className="employer-bulk-modal__title">
              Delete {selectedDeletable.length} posting{selectedDeletable.length === 1 ? '' : 's'}?
            </h2>
            <p id={modalDescId} className="employer-bulk-modal__desc">
              This removes the postings from WorkforceAP. Applicant records tied to these postings are removed too.
              Postings that are live or approved for the public board cannot be selected here — mark filled first.
            </p>
            <ul className="employer-bulk-modal__list">
              {selectedDeletable.slice(0, 6).map((id) => {
                const job = jobs.find((x) => x.id === id);
                return <li key={id}>{job?.title ?? id}</li>;
              })}
              {selectedDeletable.length > 6 && (
                <li className="employer-bulk-modal__list-more">+{selectedDeletable.length - 6} more</li>
              )}
            </ul>
            {bulkDeleteIncludesPendingReview && (
              <p id={modalPendingNoteId} className="employer-bulk-modal__pending-callout" role="note">
                <strong>In review:</strong> at least one selected posting is pending WorkforceAP review. Deleting it removes
                it from the admin review queue. You can still proceed.
              </p>
            )}
            {bulkError && <p className="employer-bulk-modal__error">{bulkError}</p>}
            <div className="employer-bulk-modal__actions">
              <button type="button" className="btn btn-ghost" disabled={bulkBusy} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary employer-bulk-modal__confirm" disabled={bulkBusy} onClick={runBulkDelete}>
                {bulkBusy ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
