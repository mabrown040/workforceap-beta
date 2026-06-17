'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { flushSync } from 'react-dom';
import { useState, useMemo, useEffect, useId, useCallback, type RefObject } from 'react';
import { trackEmployerJobAction, trackEmployerBulkDelete } from '@/lib/analytics/events';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { readinessLabel, type JobReadinessIssue, type JobReadinessLevel } from '@/lib/employer/jobReadiness';
import { EMPLOYER_JOB_BULK_MAX_IDS_PER_REQUEST } from '@/lib/employer/employerJobsBulk';
import {
  employerJobsListHref,
  type EmployerJobListFilter,
  type EmployerJobLocationType,
} from '@/lib/employer/employerJobsListQuery';
import { EMPLOYER_JOB_SUBMIT_REVIEW_DRAFT_FLASH } from '@/lib/employer/employerJobFormFlash';
import { employerJobPortalStatusLabel } from '@/lib/employer/jobStatusDisplay';

function chunkIds<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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
  updatedAt: string;
  readinessLevel: JobReadinessLevel;
  readinessIssues: JobReadinessIssue[];
};

const FILTERS: { value: EmployerJobListFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'review', label: 'In review' },
  { value: 'live', label: 'Live' },
  { value: 'filled', label: 'Filled' },
  { value: 'expired', label: 'Expired' },
];

function formatCompensation(min: number | null, max: number | null): string {
  if (min != null && max != null) {
    return `$${Math.round(min / 1000)}K–$${Math.round(max / 1000)}K`;
  }
  if (min != null) return `From $${Math.round(min / 1000)}K`;
  if (max != null) return `Up to $${Math.round(max / 1000)}K`;
  return 'Not set';
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
  if (status === 'expired') return 'employer-job-card__status--expired';
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
  if (j.status === 'expired') return 'Expired — edit to extend or close';
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

type BulkRow = { id: string; title: string; status: string };

export default function EmployerJobsBoard({
  jobs,
  filter,
  page,
  pageSize,
  totalInFilter,
  totalInDb,
  deletableInFilter,
  closableInFilter,
  titleByIdInFilter,
  locationType,
}: {
  jobs: EmployerJobBoardItem[];
  filter: EmployerJobListFilter;
  page: number;
  pageSize: number;
  totalInFilter: number;
  totalInDb: number;
  deletableInFilter: BulkRow[];
  closableInFilter: BulkRow[];
  titleByIdInFilter: Record<string, string>;
  locationType?: EmployerJobLocationType;
}) {
  const router = useRouter();
  const modalTitleId = useId();
  const modalDescId = useId();
  const modalPendingNoteId = useId();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'close'>('delete');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkOutcomeError, setBulkOutcomeError] = useState<string | null>(null);
  const [flashBanner, setFlashBanner] = useState<{ type: 'delete' | 'close'; count: number } | null>(null);
  const [submitReviewDraftNotice, setSubmitReviewDraftNotice] = useState<{
    title: string;
    reasons: string[];
  } | null>(null);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [closeModal, setCloseModal] = useState<{ id: string; title: string; status: string } | null>(null);
  const closeModalTitleId = useId();
  const closeModalDescId = useId();

  const deletableIdsInFilter = useMemo(() => deletableInFilter.map((r) => r.id), [deletableInFilter]);
  const closableIdsInFilter = useMemo(() => closableInFilter.map((r) => r.id), [closableInFilter]);

  const deletableIdsOnPage = useMemo(
    () => jobs.filter((j) => canBulkDelete(j.status)).map((j) => j.id),
    [jobs]
  );
  const closableIdsOnPage = useMemo(
    () => jobs.filter((j) => canBulkClose(j.status)).map((j) => j.id),
    [jobs]
  );

  const selectedDeletable = useMemo(
    () => [...selected].filter((id) => deletableIdsInFilter.includes(id)),
    [selected, deletableIdsInFilter]
  );

  const selectedClosable = useMemo(
    () => [...selected].filter((id) => closableIdsInFilter.includes(id)),
    [selected, closableIdsInFilter]
  );

  const bulkDeleteIncludesPendingReview = useMemo(
    () =>
      selectedDeletable.some((id) => deletableInFilter.find((d) => d.id === id)?.status === 'pending'),
    [selectedDeletable, deletableInFilter]
  );

  const totalPages = Math.max(1, Math.ceil(totalInFilter / pageSize));

  useEffect(() => {
    setSelected(new Set());
    setBulkOutcomeError(null);
  }, [filter, page]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BULK_DELETE_FLASH_KEY);
      if (raw) {
        sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
        const parsed = JSON.parse(raw) as { count?: unknown };
        const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
        if (count != null) setFlashBanner({ type: 'delete', count });
      }
    } catch {
      try {
        sessionStorage.removeItem(BULK_DELETE_FLASH_KEY);
      } catch {
        /* ignore */
      }
    }

    try {
      const raw = sessionStorage.getItem(BULK_CLOSE_FLASH_KEY);
      if (raw) {
        sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY);
        const parsed = JSON.parse(raw) as { count?: unknown };
        const count = typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : null;
        if (count != null) setFlashBanner({ type: 'close', count });
      }
    } catch {
      try {
        sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY);
      } catch {
        /* ignore */
      }
    }

    try {
      const rawDraft = sessionStorage.getItem(EMPLOYER_JOB_SUBMIT_REVIEW_DRAFT_FLASH);
      if (rawDraft) {
        sessionStorage.removeItem(EMPLOYER_JOB_SUBMIT_REVIEW_DRAFT_FLASH);
        const parsed = JSON.parse(rawDraft) as { title?: unknown; reasons?: unknown };
        const reasons = Array.isArray(parsed.reasons)
          ? parsed.reasons.filter((r): r is string => typeof r === 'string' && r.length > 0)
          : [];
        if (reasons.length > 0) {
          setSubmitReviewDraftNotice({
            title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Your posting',
            reasons,
          });
        }
      }
    } catch {
      try {
        sessionStorage.removeItem(EMPLOYER_JOB_SUBMIT_REVIEW_DRAFT_FLASH);
      } catch {
        /* ignore */
      }
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
    setSelected(new Set(deletableIdsInFilter));
  }, [deletableIdsInFilter]);

  const selectAllClosable = useCallback(() => {
    setSelected(new Set(closableIdsInFilter));
  }, [closableIdsInFilter]);

  const selectAllDeletableOnPage = useCallback(() => {
    setSelected(new Set(deletableIdsOnPage));
  }, [deletableIdsOnPage]);

  const selectAllClosableOnPage = useCallback(() => {
    setSelected(new Set(closableIdsOnPage));
  }, [closableIdsOnPage]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const resolveTitle = useCallback(
    (id: string) => titleByIdInFilter[id] ?? jobs.find((j) => j.id === id)?.title ?? id,
    [titleByIdInFilter, jobs]
  );

  const handleMassDelete = useCallback(() => {
    if (deletableIdsInFilter.length === 0) {
      setReviewActionError(
        'Nothing in this view can be bulk-removed. Live postings must be marked filled before removal.'
      );
      return;
    }
    flushSync(() => {
      setSelected(new Set(deletableIdsInFilter));
    });
    setConfirmMode('delete');
    setBulkError(null);
    setConfirmOpen(true);
  }, [deletableIdsInFilter]);

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

  async function pauseJob(id: string, jobStatus: string) {
    setPausingId(id);
    setReviewActionError(null);
    trackEmployerJobAction('pause_job', id, { status: jobStatus });
    try {
      const res = await fetch(`/api/employer/jobs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setReviewActionError(typeof data.error === 'string' ? data.error : 'Could not pause job.');
        return;
      }
      router.refresh();
    } finally {
      setPausingId(null);
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
        body: JSON.stringify({ status: 'closed' }),
      });
      if (res.ok) {
        setCloseModal(null);
        router.refresh();
      } else {
        setReviewActionError('Could not close this posting. Try again.');
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
    setBulkOutcomeError(null);
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
    setBulkOutcomeError(null);
    try {
      const batches = chunkIds(selectedDeletable, EMPLOYER_JOB_BULK_MAX_IDS_PER_REQUEST);
      let deletedCount = 0;
      for (const ids of batches) {
        const res = await fetch('/api/employer/jobs/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, action: 'delete' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const base =
            typeof data.error === 'string' ? data.error : 'Could not delete selected jobs.';
          const msg =
            deletedCount > 0
              ? `${base} (${deletedCount} posting${deletedCount === 1 ? '' : 's'} were removed before this error.)`
              : base;
          if (deletedCount > 0) {
            setBulkOutcomeError(msg);
            setConfirmOpen(false);
            clearSelection();
          } else {
            setBulkError(msg);
          }
          router.refresh();
          return;
        }
        deletedCount += typeof data.deleted === 'number' ? data.deleted : ids.length;
      }
      trackEmployerBulkDelete(deletedCount, { filter, batches: batches.length });
      try {
        sessionStorage.setItem(BULK_DELETE_FLASH_KEY, JSON.stringify({ count: deletedCount }));
      } catch {
        /* ignore */
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
          if (count != null) setFlashBanner({ type: 'delete', count });
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

  const runBulkClose = async () => {
    if (selectedClosable.length === 0) return;
    setBulkBusy(true);
    setBulkError(null);
    setBulkOutcomeError(null);
    try {
      const batches = chunkIds(selectedClosable, EMPLOYER_JOB_BULK_MAX_IDS_PER_REQUEST);
      let closedCount = 0;
      for (const ids of batches) {
        const res = await fetch('/api/employer/jobs/bulk-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, action: 'close' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const base =
            typeof data.error === 'string' ? data.error : 'Could not close selected jobs.';
          const msg =
            closedCount > 0
              ? `${base} (${closedCount} posting${closedCount === 1 ? '' : 's'} were updated before this error.)`
              : base;
          if (closedCount > 0) {
            setBulkOutcomeError(msg);
            setConfirmOpen(false);
            clearSelection();
          } else {
            setBulkError(msg);
          }
          router.refresh();
          return;
        }
        closedCount += typeof data.closed === 'number' ? data.closed : ids.length;
      }
      try {
        sessionStorage.setItem(BULK_CLOSE_FLASH_KEY, JSON.stringify({ count: closedCount }));
      } catch {
        /* ignore */
      }
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
          try {
            sessionStorage.removeItem(BULK_CLOSE_FLASH_KEY);
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
    deletableIdsInFilter.length > 0 && deletableIdsInFilter.every((id) => selected.has(id));

  const allClosableSelected =
    closableIdsInFilter.length > 0 && closableIdsInFilter.every((id) => selected.has(id));

  const allDeletableOnPageSelected =
    deletableIdsOnPage.length > 0 && deletableIdsOnPage.every((id) => selected.has(id));
  const allClosableOnPageSelected =
    closableIdsOnPage.length > 0 && closableIdsOnPage.every((id) => selected.has(id));

  const showBulkDelete = deletableIdsInFilter.length > 0;
  const showBulkClose = closableIdsInFilter.length > 0;

  if (totalInDb === 0) {
    return (
      <div className="employer-jobs-board">
        <div className="employer-jobs-board__empty-state" role="status">
          <h2 className="employer-jobs-board__empty-title">No postings yet</h2>
          <p className="employer-jobs-board__empty-desc">
            Create a posting to start hiring. Everything stays private until you submit for WorkforceAP review — nothing
            goes live by surprise.
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
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setReviewActionError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {bulkOutcomeError && (
        <div className="employer-jobs-board__action-error" role="alert">
          <p>{bulkOutcomeError}</p>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setBulkOutcomeError(null)}>
            Dismiss
          </button>
        </div>
      )}
      {flashBanner && (
        <div className="employer-jobs-flash-banner" role="status">
          <p className="employer-jobs-flash-banner__text">
            {flashBanner.type === 'delete' ? (
              <>
                <strong>{flashBanner.count}</strong> posting{flashBanner.count === 1 ? '' : 's'} removed.
              </>
            ) : (
              <>
                <strong>{flashBanner.count}</strong> posting{flashBanner.count === 1 ? '' : 's'} marked as filled.
              </>
            )}
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm employer-jobs-flash-banner__dismiss"
            onClick={() => setFlashBanner(null)}
            aria-label="Dismiss confirmation"
          >
            Dismiss
          </button>
        </div>
      )}
      {submitReviewDraftNotice && (
        <div className="employer-jobs-flash-banner employer-jobs-flash-banner--info" role="status">
          <p className="employer-jobs-flash-banner__text">
            <strong>{submitReviewDraftNotice.title}</strong> was saved as a <strong>draft</strong> instead of being sent for
            review. Complete the following, then use &quot;Send for review&quot; from My Jobs:{' '}
            {submitReviewDraftNotice.reasons.join('; ')}.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm employer-jobs-flash-banner__dismiss"
            onClick={() => setSubmitReviewDraftNotice(null)}
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="employer-jobs-board__filters" role="toolbar" aria-label="Filter by hiring stage">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={employerJobsListHref(f.value, 1, locationType)}
            className={`employer-jobs-board__filter${filter === f.value ? ' is-active' : ''}`}
            aria-current={filter === f.value ? 'true' : undefined}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {showBulkDelete && (
        <div className="employer-jobs-board__mass-delete-row">
          <button
            type="button"
            className="btn btn-outline btn-sm employer-jobs-board__mass-delete"
            onClick={handleMassDelete}
            disabled={bulkBusy}
          >
            Mass delete…
          </button>
          <span className="employer-jobs-board__mass-delete-hint">
            Selects every removable posting in this view ({deletableIdsInFilter.length}) and asks for confirmation.
            Live jobs cannot be removed here.
          </span>
        </div>
      )}

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
              <>
                <strong>{selected.size}</strong> selected
              </>
            )}
          </p>
          <div className="employer-jobs-board__bulk-actions">
            {showBulkDelete && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={selectAllDeletableOnPage}
                  disabled={deletableIdsOnPage.length === 0 || allDeletableOnPageSelected}
                >
                  All deletable (this page)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={selectAllDeletable}
                  disabled={allDeletableSelected}
                >
                  All deletable (entire filter)
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
                  onClick={selectAllClosableOnPage}
                  disabled={closableIdsOnPage.length === 0 || allClosableOnPageSelected}
                >
                  All closable (this page)
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={selectAllClosable}
                  disabled={allClosableSelected}
                >
                  All closable (entire filter)
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
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearSelection}>
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {totalInFilter === 0 ? (
        <div className="employer-jobs-board__filtered-empty">
          <p className="employer-jobs-board__empty">Nothing in this stage right now.</p>
          <Link href={employerJobsListHref('all', 1, locationType)} className="btn btn-muted btn-sm">
            Show all postings
          </Link>
        </div>
      ) : (
        <>
          <ul className="employer-jobs-board__grid">
            {jobs.map((j) => {
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
                      <span className={`employer-job-card__status ${statusModifier(j.status)}`}>
                        {employerJobPortalStatusLabel(j.status)}
                      </span>
                      {next && <span className="employer-job-card__next">{next}</span>}
                    </div>
                    <time className="employer-job-card__time" dateTime={j.updatedAt}>
                      Updated {new Date(j.updatedAt).toLocaleDateString()}
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
                            <li key={issue.key}>{issue.message}</li>
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

                    <p className="employer-job-card__apps">
                      <strong>{j.applicationsCount}</strong> application{j.applicationsCount === 1 ? '' : 's'}
                    </p>

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
                      {j.status === 'live' && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={!!pausingId || !!closingId}
                          onClick={() => pauseJob(j.id, j.status)}
                        >
                          {pausingId === j.id ? 'Pausing…' : 'Pause'}
                        </button>
                      )}
                      {(j.status === 'live' || j.status === 'approved') && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          disabled={!!closingId}
                          onClick={() => setCloseModal({ id: j.id, title: j.title, status: j.status })}
                        >
                          {closingId === j.id ? 'Updating…' : 'Close'}
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

          {totalPages > 1 && (
            <nav className="employer-jobs-board__pagination" aria-label="Job list pages">
              {page <= 1 ? (
                <span
                  className="btn btn-outline btn-sm employer-jobs-board__pagination-disabled"
                  aria-disabled="true"
                >
                  Previous
                </span>
              ) : (
                <Link
                  href={employerJobsListHref(filter, page - 1, locationType)}
                  className="btn btn-outline btn-sm employer-jobs-board__pagination-link"
                >
                  Previous
                </Link>
              )}
              <span className="employer-jobs-board__pagination-meta">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                <span className="employer-jobs-board__pagination-count"> ({totalInFilter} in this view)</span>
              </span>
              {page >= totalPages ? (
                <span
                  className="btn btn-outline btn-sm employer-jobs-board__pagination-disabled"
                  aria-disabled="true"
                >
                  Next
                </span>
              ) : (
                <Link
                  href={employerJobsListHref(filter, page + 1, locationType)}
                  className="btn btn-outline btn-sm employer-jobs-board__pagination-link"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      {closeModal && (
        <div
          className="employer-bulk-modal-overlay"
          role="presentation"
          onClick={() => !closingId && setCloseModal(null)}
        >
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
              Close posting?
            </h2>
            <p id={closeModalDescId} className="employer-bulk-modal__desc">
              This closes <strong>{closeModal.title}</strong>. Candidates will no longer see it. You can still view past
              applicants from the applicants list.
            </p>
            <div className="employer-bulk-modal__actions">
              <button type="button" className="btn btn-ghost" disabled={!!closingId} onClick={() => setCloseModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!!closingId}
                onClick={() => void confirmCloseJob()}
              >
                {closingId ? 'Updating…' : 'Yes, close posting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div
          className="employer-bulk-modal-overlay"
          role="presentation"
          onClick={() => !bulkBusy && setConfirmOpen(false)}
        >
          <div
            ref={modalTrapRef as RefObject<HTMLDivElement>}
            className="employer-bulk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
            aria-describedby={
              bulkDeleteIncludesPendingReview && confirmMode === 'delete'
                ? `${modalDescId} ${modalPendingNoteId}`
                : modalDescId
            }
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={modalTitleId} className="employer-bulk-modal__title">
              {confirmMode === 'delete' ? (
                <>
                  Remove {selectedDeletable.length} posting{selectedDeletable.length === 1 ? '' : 's'}?
                </>
              ) : (
                <>
                  Mark {selectedClosable.length} posting{selectedClosable.length === 1 ? '' : 's'} as filled?
                </>
              )}
            </h2>
            {confirmMode === 'delete' && (
              <p className="employer-bulk-modal__warning-lead" role="alert">
                <strong>This cannot be undone.</strong> Postings are permanently removed from WorkforceAP and linked
                applicant records in your portal are deleted.
              </p>
            )}
            <p id={modalDescId} className="employer-bulk-modal__desc">
              {confirmMode === 'delete' ? (
                <>
                  These postings leave WorkforceAP. Applicant records tied to them are removed too. Live and board-approved
                  roles cannot be bulk-removed — mark filled first.
                </>
              ) : (
                <>
                  These postings will move out of active hiring and into your filled/closed list. You can still view past
                  applicants from the applicants list.
                </>
              )}
            </p>
            <ul className="employer-bulk-modal__list">
              {(confirmMode === 'delete' ? selectedDeletable : selectedClosable).slice(0, 6).map((id) => (
                <li key={id}>{resolveTitle(id)}</li>
              ))}
              {(confirmMode === 'delete' ? selectedDeletable : selectedClosable).length > 6 && (
                <li className="employer-bulk-modal__list-more">
                  +{(confirmMode === 'delete' ? selectedDeletable : selectedClosable).length - 6} more
                </li>
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
              <button
                type="button"
                className="btn btn-primary employer-bulk-modal__confirm"
                disabled={bulkBusy}
                onClick={runBulkAction}
              >
                {bulkBusy
                  ? confirmMode === 'delete'
                    ? 'Removing…'
                    : 'Marking filled…'
                  : confirmMode === 'delete'
                    ? 'Yes, remove'
                    : 'Yes, mark filled'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
