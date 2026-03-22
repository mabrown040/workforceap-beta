'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect, useId, useCallback, type RefObject } from 'react';
import { trackEmployerJobAction, trackEmployerBulkDelete } from '@/lib/analytics/events';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { readinessLabel, type JobReadinessLevel } from '@/lib/employer/jobReadiness';

export type EmployerJobBoardItem = {
  id: string;
  title: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  locationType: string;
  jobType: string;
  descriptionPreview: string;
  descriptionLength: number;
  requirementsCount: number;
  suggestedProgramsCount: number;
  status: string;
  statusLabel: string;
  applicationsCount: number;
  updatedAt: Date;
  readinessLevel: JobReadinessLevel;
  readinessIssues: string[];
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'review', label: 'In review' },
  { value: 'live', label: 'Live' },
  { value: 'filled', label: 'Filled' },
] as const;

function formatCompensation(min: number | null, max: number | null): string {
  if (min != null && max != null) {
    return `$${Math.round(min / 1000)}K–$${Math.round(max / 1000)}K`;
  }
  if (min != null) return `From $${Math.round(min / 1000)}K`;
  if (max != null) return `Up to $${Math.round(max / 1000)}K`;
  return 'Compensation not set';
}

function formatWorkStyle(locationType: string, jobType: string): string {
  const loc =
    locationType === 'remote' ? 'Remote' : locationType === 'hybrid' ? 'Hybrid' : 'On-site';
  const jt =
    jobType === 'fulltime' ? 'Full-time' : jobType === 'parttime' ? 'Part-time' : 'Contract';
  return `${jt} · ${loc}`;
}

function statusModifier(status: string): string {
  if (status === 'live') return 'employer-job-card__status--live';
  if (status === 'pending') return 'employer-job-card__status--pending';
  if (status === 'approved') return 'employer-job-card__status--approved';
  if (status === 'draft') return 'employer-job-card__status--draft';
  return 'employer-job-card__status--neutral';
}

function nextStepHint(j: EmployerJobBoardItem): string {
  if (j.status === 'draft') {
    if (j.readinessLevel === 'thin') return 'Next: fill gaps, then send for review';
    if (j.readinessLevel === 'usable') return 'Next: submit for WorkforceAP review';
    return 'Next: submit for WorkforceAP review';
  }
  if (j.status === 'pending') return 'Next: WorkforceAP review — stays private';
  if (j.status === 'approved') return 'Next: go live when ready';
  if (j.status === 'live') return 'Next: mark filled when someone starts';
  if (j.status === 'filled' || j.status === 'closed') return 'Role closed — duplicate if hiring again';
  return '';
}

function canBulkDelete(status: string): boolean {
  return status === 'draft' || status === 'pending' || status === 'filled' || status === 'closed';
}

function canBulkClose(status: string): boolean {
  return status === 'live' || status === 'approved';
}

const BULK_DELETE_FLASH_KEY = 'wfap_employer_bulk_delete_ok';
const BULK_CLOSE_FLASH_KEY = 'wfap_employer_bulk_close_ok';

export default function EmployerJobsBoard({ jobs }: { jobs: EmployerJobBoardItem[] }) {
  const router = useRouter();
  const modalTitleId = useId();
  const modalDescId = useId();
  const modalPendingNoteId = useId();
  const [filter, setFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'close'>('delete');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [flashBanner, setFlashBanner] = useState<{ type: 'delete' | 'close'; count: number } | null>(null);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [closeModal, setCloseModal] = useState<{ id: string; title: string; status: string } | null>(null);
  const closeModalTitleId = useId();
  const closeModalDescId = useId();

  const filtered = useMemo(() => {
    if (filter === 'all') return jobs;
    if (filter === 'filled') return jobs.filter((j) => j.status === 'filled' || j.status === 'closed');
    if (filter === 'review') return jobs.filter((j) => j.status === 'pending' || j.status === 'approved');
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  const deletableFiltered = useMemo(
    () => filtered.filter((j) => canBulkDelete(j.status)),
    [filtered]
  );

  const closableFiltered = useMemo(
    () => filtered.filter((j) => canBulkClose(j.status)),
    [filtered]
  );

  const selectedDeletable = useMemo(
    () => [...selected].filter((id) => deletableFiltered.some((j) => j.id === id)),
    [selected, deletableFiltered]
  );

  const selectedClosable = useMemo(
    () => [...selected].filter((id) => closableFiltered.some((j) => j.id === id)),
    [selected, closableFiltered]
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
    // Check for delete flash
    try {
      const raw = sessionStorage.getItem(BULK_DELETE_FLASH_KEY);
      if (raw) {
        sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
        const parsed = JSON.parse(raw) as { count?: unknown };
        const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
        if (count != null) setFlashBanner({ type: 'delete', count });
      }
    } catch {
      try { sessionStorage.removeItem(BULK_DELETE_FLASH_KEY); } catch { /* ignore */ }
    }

    // Check for close flash
    try {
      const raw = sessionStorage.getItem(BULK_CLOSE_FLASH_KEY);
      if (raw) {
        sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY);
        const parsed = JSON.parse(raw) as { count?: unknown };
        const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
        if (count != null) setFlashBanner({ type: 'close', count });
      }
    } catch {
      try { sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY); } catch { /* ignore */ }
    }
  }, []);

  const modalTrapRef = useFocusTrap(confirmOpen, () => setConfirmOpen(false));
  const closeModalTrapRef = useFocusTrap(!!closeModal, () => setCloseModal(null));

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

  const selectAllClosable = useCallback(() => {
    setSelected(new Set(closableFiltered.map((j) => j.id)));
  }, [closableFiltered]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  async function submitForReview(id: string, jobStatus: string) {
    setBusyId(id);
    setReviewActionError(null);
    trackEmployerJobAction('submit_review', id, { status: jobStatus });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReviewActionError(typeof data.error === 'string' ? data.error : 'Could not submit for review.');
        return;
      }
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function publishJob(id: string, jobStatus: string) {
    setPublishingId(id);
    setReviewActionError(null);
    trackEmployerJobAction('publish', id, { status: jobStatus });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'live' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReviewActionError(typeof data.error === 'string' ? data.error : 'Could not publish job.');
        return;
      }
      router.refresh();
    } finally {
      setPublishingId(null);
    }
  }

  const confirmCloseJob = async () => {
    if (!closeModal) return;
    const { id, status } = closeModal;
    setClosingId(id);
    setReviewActionError(null);
    trackEmployerJobAction('close_job', id, { status });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'filled' }),
      });
      if (res.ok) {
        setCloseModal(null);
        router.refresh();
      } else {
        setReviewActionError('Could not mark this posting as filled. Try again.');
      }
    } finally {
      setClosingId(null);
    }
  };

  const openConfirm = (mode: 'delete' | 'close') => {
    if (mode === 'delete' && selectedDeletable.length === 0) return;
    if (mode === 'close' && selectedClosable.length === 0) return;
    setConfirmMode(mode);
    setBulkError(null);
    setConfirmOpen(true);
  };

  const runBulkAction = async () => {
    if (confirmMode === 'delete') {
      await runBulkDelete();
    } else {
      await runBulkClose();
    }
  };

  const runBulkDelete = async () => {
    if (selectedDeletable.length === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch('/api/employer/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDeletable, action: 'delete' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkError(typeof data.error === 'string' ? data.error : 'Could not delete selected jobs.');
        return;
      }
      const deletedCount = typeof data.deleted === 'number' ? data.deleted : selectedDeletable.length;
      trackEmployerBulkDelete(deletedCount, { filter });
      try {
        sessionStorage.setItem(BULK_DELETE_FLASH_KEY, JSON.stringify({ count: deletedCount }));
      } catch { /* ignore quota / private mode */ }
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
          if (count != null) setFlashBanner({ type: 'delete', count });
        } catch {
          try { sessionStorage.removeItem(BULK_DELETE_FLASH_KEY); } catch { /* ignore */ }
        }
      });
    } catch {
      setBulkError('Network error. Check your connection and try again.');
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkClose = async () => {
    if (selectedClosable.length === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    try {
      const res = await fetch('/api/employer/jobs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedClosable, action: 'close' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBulkError(typeof data.error === 'string' ? data.error : 'Could not close selected jobs.');
        return;
      }
      const closedCount = typeof data.closed === 'number' ? data.closed : selectedClosable.length;
      try {
        sessionStorage.setItem(BULK_CLOSE_FLASH_KEY, JSON.stringify({ count: closedCount }));
      } catch { /* ignore quota / private mode */ }
      setConfirmOpen(false);
      clearSelection();
      router.refresh();
      queueMicrotask(() => {
        try {
          const raw = sessionStorage.getItem(BULK_CLOSE_FLASH_KEY);
          if (!raw) return;
          sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY);
          const parsed = JSON.parse(raw) as { count?: unknown };
          const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
          if (count != null) setFlashBanner({ type: 'close', count });
        } catch {
          try { sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY); } catch { /* ignore */ }
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

  const allClosableSelected =
    closableFiltered.length > 0 && closableFiltered.every((j) => selected.has(j.id));

  const counts = useMemo(() => {
    const c = { draft: 0, inReview: 0, live: 0, filled: 0 };
    for (const j of jobs) {
      if (j.status === 'draft') c.draft += 1;
      else if (j.status === 'pending' || j.status === 'approved') c.inReview += 1;
      else if (j.status === 'live') c.live += 1;
      else if (j.status === 'filled' || j.status === 'closed') c.filled += 1;
    }
    return c;
  }, [jobs]);

  // Determine which bulk actions to show based on current filter
  const showBulkDelete = deletableFiltered.length > 0;
  const showBulkClose = closableFiltered.length > 0;

  if (jobs.length === 0) {
    return (
      <div className="employer-jobs-board">
        <div className="employer-jobs-board__empty-state" role="status">
          <h2 className="employer-jobs-board__empty-title">No postings yet</h2>
          <p className="employer-jobs-board__empty-desc">
            Create a posting to start hiring. Everything stays private until you submit for WorkforceAP
            review — nothing goes live by surprise.
          </p>
          <div className="employer-jobs-board__empty-actions">
            <Link href="/employer/jobs/new" className="btn btn-primary">
              Create your first posting
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="employer-jobs-board">
      {reviewActionError && (
        <div className="employer-jobs-board__action-error" role="alert">
          <p>{reviewActionError}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewActionError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {flashBanner && (
        <div className="employer-jobs-flash-banner" role="status">
          <p className="employer-jobs-flash-banner__text">
            {flashBanner.type === 'delete' ? (
              <><strong>{flashBanner.count}</strong> posting{flashBanner.count === 1 ? '' : 's'} removed.</>
            ) : (
              <><strong>{flashBanner.count}</strong> posting{flashBanner.count === 1 ? '' : 's'} marked as filled.</>
            )}
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

      <div className="employer-jobs-board__filters" role="toolbar" aria-label="Filter by hiring stage">
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

      {/* Bulk actions bar */}
      {(showBulkDelete || showBulkClose) && (
        <div
          className="employer-jobs-board__bulk-bar"
          role="region"
          aria-label="Bulk actions for selected postings"
        >
          <p className="employer-jobs-board__bulk-count" aria-live="polite">
            {selected.size === 0 ? (
              <>Select postings below for bulk actions.</>
            ) : (
              <><strong>{selected.size}</strong> selected</>
            )}
          </p>
          <div className="employer-jobs-board__bulk-actions">
            {showBulkDelete && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={selectAllDeletable}
                  disabled={allDeletableSelected}
                >
                  Select deletable
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm employer-jobs-board__bulk-delete"
                  disabled={selectedDeletable.length === 0 || bulkBusy}
                  onClick={() => openConfirm('delete')}
                >
                  Remove ({selectedDeletable.length})
                </button>
              </>
            )}
            {showBulkClose && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={selectAllClosable}
                  disabled={allClosableSelected}
                >
                  Select closable
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={selectedClosable.length === 0 || bulkBusy}
                  onClick={() => openConfirm('close')}
                >
                  Mark filled ({selectedClosable.length})
                </button>
              </>
            )}
            {selected.size > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={clearSelection}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="employer-jobs-board__filtered-empty">
          <p className="employer-jobs-board__empty">Nothing in this stage right now.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilter('all')}>
            Show all postings
          </button>
        </div>
      ) : (
        <ul className="employer-jobs-board__grid" role="list">
          {filtered.map((j) => {
            const deletable = canBulkDelete(j.status);
            const closable = canBulkClose(j.status);
            const selectable = deletable || closable;
            const checked = selected.has(j.id);
            const pay = formatCompensation(j.salaryMin, j.salaryMax);
            const workStyle = formatWorkStyle(j.locationType, j.jobType);
            const next = nextStepHint(j);
            const showReadiness = j.status === 'draft' && j.readinessIssues.length > 0;
            const showPendingNote = j.status === 'pending';

            return (
              <li key={j.id}>
                <article className="employer-job-card">
                  {selectable && (
                    <label className="employer-job-card__select">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleOne(j.id, e.target.checked)}
                        aria-label={`Select ${j.title}`}
                      />
                    </label>
                  )}
                  <div className="employer-job-card__lane">
                    <span className={`employer-job-card__status ${statusModifier(j.status)}`}>{j.statusLabel}</span>
                    {next && <span className="employer-job-card__next">{next}</span>}
                  </div>
                  <time className="employer-job-card__time" dateTime={j.updatedAt.toISOString()}>
                    Updated {j.updatedAt.toLocaleDateString()}
                  </time>

                  {showPendingNote && (
                    <p className="employer-job-card__safety">
                      With WorkforceAP for review — candidates do not see this posting yet.
                    </p>
                  )}

                  {showReadiness && (
                    <div
                      className={`employer-job-card__readiness employer-job-card__readiness--${j.readinessLevel}`}
                      role="note"
                    >
                      <span className="employer-job-card__readiness-label">{readinessLabel(j.readinessLevel)}</span>
                      <ul className="employer-job-card__readiness-list">
                        {j.readinessIssues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <h2 className="employer-job-card__title">{j.title}</h2>

                  <dl className="employer-job-card__facts">
                    <div className="employer-job-card__fact">
                      <dt>Where</dt>
                      <dd>{j.location}</dd>
                    </div>
                    <div className="employer-job-card__fact">
                      <dt>Pay</dt>
                      <dd>{pay}</dd>
                    </div>
                    <div className="employer-job-card__fact">
                      <dt>How</dt>
                      <dd>{workStyle}</dd>
                    </div>
                  </dl>

                  <p className="employer-job-card__preview">{j.descriptionPreview}</p>

                  {j.status !== 'draft' && (
                    <p className="employer-job-card__apps">
                      <strong>{j.applicationsCount}</strong> application{j.applicationsCount === 1 ? '' : 's'}
                    </p>
                  )}

                  <div className="employer-job-card__actions">
                    <Link
                      href={`/employer/jobs/${j.id}`}
                      className="btn btn-primary btn-sm employer-job-card__action-primary"
                      onClick={() => trackEmployerJobAction('edit', j.id, { status: j.status })}
                    >
                      {j.status === 'draft' ? 'Edit draft' : 'View & edit'}
                    </Link>
                    {j.status === 'draft' && (
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        disabled={busyId === j.id}
                        onClick={() => submitForReview(j.id, j.status)}
                      >
                        {busyId === j.id ? 'Sending…' : 'Send for review'}
                      </button>
                    )}
                    {j.status === 'approved' && (
                      <button
                        type="button"
                        className="btn btn-accent btn-sm"
                        disabled={publishingId === j.id}
                        onClick={() => publishJob(j.id, j.status)}
                      >
                        {publishingId === j.id ? 'Publishing…' : 'Go live'}
                      </button>
                    )}
                    {(j.status === 'live' || j.status === 'approved') && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={!!closingId}
                        onClick={() => setCloseModal({ id: j.id, title: j.title, status: j.status })}
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
                        View applicants
                      </Link>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {closeModal && (
        <div className="employer-bulk-modal-overlay" role="presentation" onClick={() => !closingId && setCloseModal(null)}>
          <div
            ref={closeModalTrapRef as RefObject<HTMLDivElement>}
            className="employer-bulk-modal employer-close-job-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={closeModalTitleId}
            aria-describedby={closeModalDescId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={closeModalTitleId} className="employer-bulk-modal__title">
              Mark filled?
            </h2>
            <p id={closeModalDescId} className="employer-bulk-modal__desc">
              This moves <strong>{closeModal.title}</strong> out of active hiring. You can still view past applicants from
              the applicants list.
            </p>
            <div className="employer-bulk-modal__actions">
              <button type="button" className="btn btn-ghost" disabled={!!closingId} onClick={() => setCloseModal(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={!!closingId} onClick={() => void confirmCloseJob()}>
                {closingId ? 'Updating…' : 'Yes, mark filled'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="employer-bulk-modal-overlay" role="presentation" onClick={() => !bulkBusy && setConfirmOpen(false)}>
          <div
            ref={modalTrapRef as RefObject<HTMLDivElement>}
            className="employer-bulk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={bulkDeleteIncludesPendingReview && confirmMode === 'delete' ? `${modalDescId} ${modalPendingNoteId}` : modalDescId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={modalTitleId} className="employer-bulk-modal__title">
              {confirmMode === 'delete' ? (
                <>Remove {selectedDeletable.length} posting{selectedDeletable.length === 1 ? '' : 's'}?</>
              ) : (
                <>Mark {selectedClosable.length} posting{selectedClosable.length === 1 ? '' : 's'} as filled?</>
              )}
            </h2>
            <p id={modalDescId} className="employer-bulk-modal__desc">
              {confirmMode === 'delete' ? (
                <>These postings leave WorkforceAP. Applicant records tied to them are removed too. Live and board-approved
                roles cannot be bulk-removed — mark filled first.</>
              ) : (
                <>These postings will move out of active hiring and into your filled/closed list. You can still view
                past applicants from the applicants list.</>
              )}
            </p>
            <ul className="employer-bulk-modal__list">
              {(confirmMode === 'delete' ? selectedDeletable : selectedClosable).slice(0, 6).map((id) => {
                const job = jobs.find((x) => x.id === id);
                return <li key={id}>{job?.title ?? id}</li>;
              })}
              {(confirmMode === 'delete' ? selectedDeletable : selectedClosable).length > 6 && (
                <li className="employer-bulk-modal__list-more">+{(confirmMode === 'delete' ? selectedDeletable : selectedClosable).length - 6} more</li>
              )}
            </ul>
            {confirmMode === 'delete' && bulkDeleteIncludesPendingReview && (
              <p id={modalPendingNoteId} className="employer-bulk-modal__pending-callout" role="note">
                <strong>In review:</strong> at least one selected posting is waiting on WorkforceAP. Removing it pulls it
                from our review queue. You can still continue.
              </p>
            )}
            {bulkError && <p className="employer-bulk-modal__error">{bulkError}</p>}
            <div className="employer-bulk-modal__actions">
              <button type="button" className="btn btn-ghost" disabled={bulkBusy} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary employer-bulk-modal__confirm" disabled={bulkBusy} onClick={runBulkAction}>
                {bulkBusy ? (confirmMode === 'delete' ? 'Removing…' : 'Marking filled…') : (confirmMode === 'delete' ? 'Yes, remove' : 'Yes, mark filled')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
