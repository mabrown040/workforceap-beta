'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  listFollowUpTemplates,
  templateMatchesPriorities,
  type FollowUpAudience,
  type FollowUpTemplateId,
} from '@/lib/counselor/followUpTemplates';
import type {
  PriorityBucket,
  PriorityQueueRow,
} from '@/lib/counselor/priorityQueue';

/**
 * Counselor Priority Queue — single sortable table that replaces the
 * scattered "alerts here, inactive list there" pattern with one tactical
 * view. Three priority buckets: CRITICAL (red), WARNING (yellow),
 * ON TRACK (green). Bulk-select rows → choose a follow-up template →
 * fan out via /api/counselor/bulk-followup.
 *
 * The component is intentionally a single self-contained client component
 * so the counselor can sort and act without page reloads. Server-side data
 * comes in via props (see lib/counselor/priorityQueue.ts).
 */

type SortKey = 'severity' | 'days_inactive' | 'last_contact';

type BulkSendResult = {
  ok: boolean;
  sent: number;
  failed: number;
  templateName: string;
};

const BUCKET_RANK: Record<PriorityBucket, number> = {
  critical: 0,
  warning: 1,
  ontrack: 2,
};

const BUCKET_AUDIENCE: Record<PriorityBucket, FollowUpAudience> = {
  critical: 'critical',
  warning: 'warning',
  ontrack: 'all',
};

const BUCKET_ACCENT: Record<
  PriorityBucket,
  { dot: string; surface: string; text: string }
> = {
  critical: {
    dot: 'var(--color-accent)',
    surface:
      'color-mix(in srgb, var(--color-accent) 12%, var(--surface-container-lowest))',
    text: 'var(--color-accent)',
  },
  warning: {
    dot: 'var(--color-warning-on-surface)',
    surface:
      'color-mix(in srgb, var(--color-warning-on-surface) 10%, var(--surface-container-lowest))',
    text: 'var(--color-warning-on-surface)',
  },
  ontrack: {
    dot: 'var(--color-green)',
    surface:
      'color-mix(in srgb, var(--color-green) 8%, var(--surface-container-lowest))',
    text: 'var(--color-green)',
  },
};

export type CounselorPriorityQueueProps = {
  rows: PriorityQueueRow[];
  totals: {
    critical: number;
    warning: number;
    ontrack: number;
    total: number;
  };
};

export default function CounselorPriorityQueue({ rows, totals }: CounselorPriorityQueueProps) {
  const t = useTranslations('counselor');
  const [sortKey, setSortKey] = useState<SortKey>('severity');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<FollowUpTemplateId | ''>('');
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<BulkSendResult | null>(null);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortKey === 'severity') {
      copy.sort((a, b) => {
        const bucketDelta = BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket];
        if (bucketDelta !== 0) return bucketDelta;
        return (b.daysSinceLogin ?? 0) - (a.daysSinceLogin ?? 0);
      });
    } else if (sortKey === 'days_inactive') {
      copy.sort((a, b) => (b.daysSinceLogin ?? -1) - (a.daysSinceLogin ?? -1));
    } else if (sortKey === 'last_contact') {
      copy.sort(
        (a, b) =>
          (a.lastContactAt?.getTime() ?? Number.POSITIVE_INFINITY) -
          (b.lastContactAt?.getTime() ?? Number.POSITIVE_INFINITY),
      );
    }
    return copy;
  }, [rows, sortKey]);

  const selectedRows = useMemo(
    () => sortedRows.filter((r) => selectedIds.has(r.memberId)),
    [sortedRows, selectedIds],
  );

  const selectedPriorities = useMemo<FollowUpAudience[]>(
    () => Array.from(new Set(selectedRows.map((r) => BUCKET_AUDIENCE[r.bucket]))),
    [selectedRows],
  );

  const allTemplates = listFollowUpTemplates();
  const applicableTemplates = useMemo(
    () =>
      selectedPriorities.length === 0
        ? allTemplates
        : allTemplates.filter((tpl) => templateMatchesPriorities(tpl, selectedPriorities)),
    [allTemplates, selectedPriorities],
  );

  function toggleRow(memberId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === sortedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedRows.map((r) => r.memberId)));
    }
  }

  async function handleSend() {
    if (!templateId || selectedIds.size === 0) return;
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/counselor/bulk-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberIds: Array.from(selectedIds),
          templateId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      const matchedTemplate = allTemplates.find((tpl) => tpl.id === templateId);
      setLastResult({
        ok: res.ok && !!data?.ok,
        sent: data?.sent ?? 0,
        failed: data?.failed ?? selectedIds.size,
        templateName: matchedTemplate?.name ?? templateId,
      });
      if (res.ok && data?.ok) {
        setSelectedIds(new Set());
        setTemplateId('');
      }
    } catch {
      setLastResult({
        ok: false,
        sent: 0,
        failed: selectedIds.size,
        templateName: templateId,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label={t('priorityQueueTitle')}
      className="portal-card portal-card--flat"
      style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h2 className="portal-section-heading" style={{ margin: 0 }}>
            {t('priorityQueueTitle')}
          </h2>
          <p
            className="portal-page-subtitle"
            style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}
          >
            {t('priorityQueueSubtitle')}
          </p>
        </div>
        <PriorityChips totals={totals} t={t} />
      </header>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <label
          htmlFor="counselor-pq-sort"
          style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}
        >
          {t('priorityQueueSortLabel')}
        </label>
        <select
          id="counselor-pq-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          style={{
            padding: '0.4rem 0.6rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container)',
            color: 'var(--color-on-surface)',
            fontSize: '0.8125rem',
            minHeight: '2.25rem',
          }}
        >
          <option value="severity">{t('priorityQueueSortSeverity')}</option>
          <option value="days_inactive">{t('priorityQueueSortDaysInactive')}</option>
          <option value="last_contact">{t('priorityQueueSortLastContact')}</option>
        </select>
      </div>

      {selectedIds.size > 0 ? (
        <div
          role="region"
          aria-label={t('priorityQueueBulkToolbar')}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            borderRadius: '0.625rem',
            background:
              'color-mix(in srgb, var(--color-accent) 8%, var(--surface-container))',
            border: '1px solid color-mix(in srgb, var(--color-accent) 25%, var(--outline-variant))',
          }}
        >
          <span style={{ fontWeight: 700, color: 'var(--color-on-surface)', fontSize: '0.875rem' }}>
            {t('priorityQueueSelectedCount', { count: selectedIds.size })}
          </span>
          <select
            aria-label={t('priorityQueueChooseTemplate')}
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as FollowUpTemplateId | '')}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--outline-variant)',
              background: 'var(--surface-container-low)',
              color: 'var(--color-on-surface)',
              fontSize: '0.8125rem',
              minHeight: '2.25rem',
            }}
          >
            <option value="">{t('priorityQueueChooseTemplate')}</option>
            {applicableTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!templateId || sending}
            onClick={handleSend}
            style={{ fontSize: '0.8125rem', minHeight: '2.25rem' }}
          >
            {sending ? t('priorityQueueSending') : t('priorityQueueSend')}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setSelectedIds(new Set());
              setTemplateId('');
            }}
            style={{ fontSize: '0.8125rem', minHeight: '2.25rem' }}
          >
            {t('priorityQueueClear')}
          </button>
        </div>
      ) : null}

      {lastResult ? (
        <div
          role="alert"
          aria-live="polite"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '0.75rem',
            borderRadius: '0.625rem',
            background: lastResult.ok
              ? 'color-mix(in srgb, var(--color-green) 12%, var(--surface-container-lowest))'
              : 'color-mix(in srgb, var(--color-accent) 12%, var(--surface-container-lowest))',
            border: `1px solid ${
              lastResult.ok ? 'var(--color-green)' : 'var(--color-accent)'
            }`,
            color: 'var(--color-on-surface)',
            fontSize: '0.875rem',
          }}
        >
          {lastResult.ok
            ? t('priorityQueueSendSuccess', {
                count: lastResult.sent,
                template: lastResult.templateName,
              })
            : t('priorityQueueSendError', {
                failed: lastResult.failed,
                sent: lastResult.sent,
              })}
        </div>
      ) : null}

      {sortedRows.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.9rem',
          }}
        >
          {t('priorityQueueEmpty')}
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            role="table"
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}
          >
            <caption className="wa-sr-only">{t('priorityQueueTableCaption')}</caption>
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                <th scope="col" style={{ padding: '0.5rem 0.5rem' }}>
                  <label className="wa-sr-only" htmlFor="counselor-pq-select-all">
                    {t('priorityQueueSelectAll')}
                  </label>
                  <input
                    id="counselor-pq-select-all"
                    type="checkbox"
                    aria-label={t('priorityQueueSelectAll')}
                    checked={selectedIds.size === sortedRows.length && sortedRows.length > 0}
                    onChange={toggleAll}
                    style={{ width: '1.25rem', height: '1.25rem' }}
                  />
                </th>
                <th scope="col" style={{ padding: '0.5rem 0.5rem' }}>
                  {t('priorityQueueColPriority')}
                </th>
                <th scope="col" style={{ padding: '0.5rem 0.5rem' }}>
                  {t('priorityQueueColMember')}
                </th>
                <th scope="col" style={{ padding: '0.5rem 0.5rem' }}>
                  {t('priorityQueueColBlocker')}
                </th>
                <th scope="col" style={{ padding: '0.5rem 0.5rem' }}>
                  {t('priorityQueueColDays')}
                </th>
                <th scope="col" style={{ padding: '0.5rem 0.5rem' }}>
                  {t('priorityQueueColActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const accent = BUCKET_ACCENT[row.bucket];
                const isSelected = selectedIds.has(row.memberId);
                return (
                  <tr
                    key={row.memberId}
                    style={{
                      borderTop: '1px solid var(--outline-variant)',
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)'
                        : undefined,
                    }}
                  >
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <label
                        className="wa-sr-only"
                        htmlFor={`counselor-pq-select-${row.memberId}`}
                      >
                        {t('priorityQueueSelectMember', { name: row.memberName })}
                      </label>
                      <input
                        id={`counselor-pq-select-${row.memberId}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.memberId)}
                        aria-label={t('priorityQueueSelectMember', { name: row.memberName })}
                        style={{
                          width: '2.75rem',
                          height: '2.75rem',
                          // ≥44px tap target per a11y constraint. The visible
                          // checkbox is intrinsic but the input fills the
                          // hit area via padding-trick:
                          padding: 0,
                          margin: 0,
                          cursor: 'pointer',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '999px',
                          background: accent.surface,
                          color: accent.text,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: '0.55rem',
                            height: '0.55rem',
                            borderRadius: '50%',
                            background: accent.dot,
                          }}
                        />
                        {bucketLabel(row.bucket, t)}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <Link
                        href={`/counselor/students/${row.memberId}`}
                        style={{ color: 'var(--color-on-surface)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {row.memberName}
                      </Link>
                      <p
                        style={{
                          margin: '0.1rem 0 0',
                          fontSize: '0.75rem',
                          color: 'var(--color-on-surface-variant)',
                        }}
                      >
                        {row.enrolledProgram ?? t('priorityQueueNoProgram')}
                      </p>
                    </td>
                    <td
                      style={{
                        padding: '0.6rem 0.5rem',
                        color: 'var(--color-on-surface)',
                      }}
                    >
                      {row.blockerReason}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem', color: 'var(--color-on-surface-variant)' }}>
                      {row.daysSinceLogin == null
                        ? '—'
                        : t('priorityQueueDays', { count: row.daysSinceLogin })}
                    </td>
                    <td style={{ padding: '0.6rem 0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Link
                          href={
                            row.threadId
                              ? `/counselor/messages?thread=${row.threadId}`
                              : `/counselor/students/${row.memberId}`
                          }
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', minHeight: '2.25rem' }}
                        >
                          {t('priorityQueueActionMessage')}
                        </Link>
                        <Link
                          href={`/counselor/students/${row.memberId}`}
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.75rem', minHeight: '2.25rem' }}
                        >
                          {t('priorityQueueActionProfile')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function bucketLabel(bucket: PriorityBucket, t: ReturnType<typeof useTranslations>): string {
  if (bucket === 'critical') return t('priorityQueueBucketCritical');
  if (bucket === 'warning') return t('priorityQueueBucketWarning');
  return t('priorityQueueBucketOnTrack');
}

function PriorityChips({
  totals,
  t,
}: {
  totals: CounselorPriorityQueueProps['totals'];
  t: ReturnType<typeof useTranslations>;
}) {
  const items: Array<{ bucket: PriorityBucket; value: number; label: string }> = [
    { bucket: 'critical', value: totals.critical, label: t('priorityQueueBucketCritical') },
    { bucket: 'warning', value: totals.warning, label: t('priorityQueueBucketWarning') },
    { bucket: 'ontrack', value: totals.ontrack, label: t('priorityQueueBucketOnTrack') },
  ];
  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {items.map((item) => {
        const accent = BUCKET_ACCENT[item.bucket];
        return (
          <span
            key={item.bucket}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.6rem',
              borderRadius: '999px',
              background: accent.surface,
              color: accent.text,
              fontWeight: 700,
              fontSize: '0.75rem',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '0.5rem',
                height: '0.5rem',
                borderRadius: '50%',
                background: accent.dot,
              }}
            />
            {item.value} {item.label}
          </span>
        );
      })}
    </div>
  );
}
