'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import {
  INBOX_FLAG_LABELS,
  type InboxZeroQueue,
  type InboxZeroRow,
} from '@/lib/counselor/inboxZero';
import { getProgramBySlug } from '@/lib/content/programs';

type Props = {
  initialQueue: InboxZeroQueue;
};

export default function InboxZeroClient({ initialQueue }: Props) {
  const t = useTranslations('counselor');
  const [queue, setQueue] = useState(initialQueue);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [modalRow, setModalRow] = useState<InboxZeroRow | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const refreshQueue = async () => {
    const res = await fetchWithTimeout('/api/counselor/inbox-zero', {}, 15000);
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    setQueue(data.queue);
  };

  const submitDismiss = async () => {
    if (!modalRow || !note.trim()) return;
    setDismissingId(modalRow.memberId);
    setError(null);
    try {
      const allFlags = [modalRow.primaryFlag, ...modalRow.additionalFlags];
      const res = await fetchWithTimeout('/api/counselor/inbox-zero/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: modalRow.memberId,
          reason: note.trim(),
          flags: allFlags,
        }),
      }, 15000);
      if (!res.ok) throw new Error('dismiss failed');
      setModalRow(null);
      setNote('');
      await refreshQueue();
    } catch {
      setError(t('inboxZeroDismissFailed'));
    } finally {
      setDismissingId(null);
    }
  };

  if (queue.rows.length === 0) {
    return (
      <PortalEmptyState
        title={t('inboxZeroClearTitle')}
        description={t('inboxZeroClearDesc')}
        icon={
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '2rem', color: 'var(--color-green)' }}
            aria-hidden="true"
          >
            done_all
          </span>
        }
        primaryAction={{ label: t('openMessages'), href: '/counselor/messages' }}
        secondaryAction={{ label: t('backToDashboard'), href: '/counselor' }}
      />
    );
  }

  return (
    <>
      <div className="content-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
          {t('inboxZeroCount', { count: queue.rows.length })}
        </p>
        {queue.totals.dismissedToday > 0 ? (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            {t('inboxZeroDismissedToday', { count: queue.totals.dismissedToday })}
          </p>
        ) : null}
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
          {t('inboxZeroSortHint')}
        </p>
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.75rem' }}>
        {queue.rows.map((row) => (
          <InboxZeroRowCard
            key={row.memberId}
            row={row}
            onDismiss={() => {
              setModalRow(row);
              setNote('');
              setError(null);
            }}
            dismissing={dismissingId === row.memberId}
          />
        ))}
      </ul>

      {modalRow ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="inbox-dismiss-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            padding: '1rem',
          }}
          onClick={() => !dismissingId && setModalRow(null)}
        >
          <div
            className="content-card"
            style={{ maxWidth: 480, width: '100%', padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="inbox-dismiss-title" style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
              {t('inboxZeroDismissTitle', { name: modalRow.memberName })}
            </h2>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              {t('inboxZeroDismissDesc')}
            </p>
            <label htmlFor="inbox-dismiss-note" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              {t('inboxZeroDismissNoteLabel')}
            </label>
            <textarea
              id="inbox-dismiss-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder={t('inboxZeroDismissNotePlaceholder')}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: 6,
                border: '1px solid var(--color-outline-variant)',
                fontSize: '0.9rem',
                resize: 'vertical',
              }}
            />
            {error ? (
              <p style={{ margin: '0.5rem 0 0', color: 'var(--color-accent)', fontSize: '0.85rem' }}>{error}</p>
            ) : null}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-muted"
                disabled={!!dismissingId}
                onClick={() => setModalRow(null)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!!dismissingId || !note.trim()}
                onClick={submitDismiss}
              >
                {dismissingId ? t('saving') : t('inboxZeroDismissConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InboxZeroRowCard({
  row,
  onDismiss,
  dismissing,
}: {
  row: InboxZeroRow;
  onDismiss: () => void;
  dismissing: boolean;
}) {
  const t = useTranslations('counselor');
  const programLabel = row.enrolledProgram
    ? getProgramBySlug(row.enrolledProgram)?.title ?? row.enrolledProgram
    : t('notEnrolled');

  const priorityColor =
    row.priorityRank === 0
      ? 'var(--color-accent, #b00020)'
      : row.priorityRank === 1
        ? 'var(--color-gold, #b07d2c)'
        : 'var(--color-blue, #1f6feb)';

  const metadata = formatRowMetadata(row);

  return (
    <li
      className="content-card"
      style={{
        padding: '0.75rem 1rem',
        borderLeft: `4px solid ${priorityColor}`,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/counselor/students/${row.memberId}`}
            style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}
          >
            {row.memberName}
          </Link>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            {row.memberEmail} · {programLabel}
          </p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
            <strong>{INBOX_FLAG_LABELS[row.primaryFlag]}</strong>
            {metadata ? (
              <span style={{ color: 'var(--color-on-surface-variant)' }}> · {metadata}</span>
            ) : null}
          </p>
          {row.additionalFlags.length > 0 ? (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              {t('inboxZeroAlso')}: {row.additionalFlags.map((f) => INBOX_FLAG_LABELS[f]).join(' · ')}
            </p>
          ) : null}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href={`/counselor/students/${row.memberId}`}
            className="btn btn-muted"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
          >
            {t('openMember')}
          </Link>
          <button
            type="button"
            className="btn btn-muted"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            disabled={dismissing}
            onClick={onDismiss}
          >
            {dismissing ? t('saving') : t('inboxZeroDismiss')}
          </button>
        </div>
      </div>
    </li>
  );
}

function formatRowMetadata(row: InboxZeroRow): string | null {
  const parts: string[] = [];
  if (row.context.atRiskScore !== undefined) {
    parts.push(`risk ${row.context.atRiskScore}`);
  }
  if (row.context.daysSinceAssignment !== undefined) {
    parts.push(`${row.context.daysSinceAssignment}d since assigned`);
  }
  if (row.context.daysSinceApplication !== undefined) {
    parts.push(`${row.context.daysSinceApplication}d on application`);
  }
  if (row.context.daysSinceLastContact !== undefined) {
    parts.push(`${row.context.daysSinceLastContact}d since contact`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
