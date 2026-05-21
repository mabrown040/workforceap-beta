'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import PortalEmptyState from '@/components/portal/PortalEmptyState';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';
import {
  INBOX_FLAG_LABELS,
  type InboxZeroQueue,
  type InboxZeroRow,
} from '@/lib/counselor/inboxZero';
import {
  listFollowUpTemplates,
  templateMatchesFlags,
  type FollowUpTemplateId,
} from '@/lib/counselor/templates';
import { getProgramBySlug } from '@/lib/content/programs';

type Props = { initialQueue: InboxZeroQueue };
type CounselorOption = { userId: string; fullName: string };
type BulkAction = 'follow_up' | 'mark_contacted' | 'reassign' | 'dismiss';

export default function InboxZeroClient({ initialQueue }: Props) {
  const t = useTranslations('counselor');
  const [queue, setQueue] = useState(initialQueue);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<FollowUpTemplateId | ''>('');
  const [reassignCounselorId, setReassignCounselorId] = useState('');
  const [counselors, setCounselors] = useState<CounselorOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [bulkModal, setBulkModal] = useState<'dismiss' | null>(null);
  const [bulkNote, setBulkNote] = useState('');
  const [singleDismissRow, setSingleDismissRow] = useState<InboxZeroRow | null>(null);
  const [singleNote, setSingleNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const templates = useMemo(() => listFollowUpTemplates(), []);
  const selectedRows = useMemo(
    () => queue.rows.filter((r) => selectedIds.has(r.memberId)),
    [queue.rows, selectedIds],
  );
  const applicableTemplates = useMemo(() => {
    if (selectedRows.length === 0) return templates;
    const flags = selectedRows.flatMap((r) => [r.primaryFlag, ...r.additionalFlags]);
    return templates.filter((tpl) => templateMatchesFlags(tpl, flags));
  }, [selectedRows, templates]);

  useEffect(() => {
    if (templateId && !applicableTemplates.some((tpl) => tpl.id === templateId)) {
      setTemplateId('');
    }
  }, [applicableTemplates, templateId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout('/api/counselor/counselors', {}, 15000);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.counselors)) {
          setCounselors(
            data.counselors.map((c: { userId: string; fullName: string }) => ({
              userId: c.userId,
              fullName: c.fullName,
            })),
          );
        }
      } catch {
        /* non-blocking */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refreshQueue = async () => {
    const res = await fetchWithTimeout('/api/counselor/inbox-zero', {}, 15000);
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    setQueue(data.queue);
  };

  const toggleSelect = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === queue.rows.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(queue.rows.map((r) => r.memberId)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setTemplateId('');
    setReassignCounselorId('');
  };

  const runBulk = useCallback(
    async (action: BulkAction, extra?: { reason?: string }) => {
      if (selectedIds.size === 0) return;
      setBusy(true);
      setError(null);
      setResultMsg(null);
      try {
        const memberIds = Array.from(selectedIds);
        const body: Record<string, unknown> = { action, memberIds };
        if (action === 'follow_up') {
          if (!templateId) { setError(t('inboxZeroBulkSelectTemplate')); return; }
          body.templateId = templateId;
        } else if (action === 'reassign') {
          if (!reassignCounselorId) { setError(t('inboxZeroBulkSelectCounselor')); return; }
          body.counselorUserId = reassignCounselorId;
        } else if (action === 'dismiss') {
          const reason = extra?.reason?.trim();
          if (!reason) return;
          body.reason = reason;
          body.flags = selectedRows.flatMap((r) => [r.primaryFlag, ...r.additionalFlags]);
        }
        const res = await fetchWithTimeout('/api/counselor/inbox-zero/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }, 30000);
        if (!res.ok) throw new Error('bulk failed');
        const data = await res.json();
        setResultMsg(t('inboxZeroBulkResult', { sent: data.sent ?? 0, failed: data.failed ?? 0 }));
        setBulkModal(null);
        setBulkNote('');
        clearSelection();
        await refreshQueue();
      } catch {
        setError(t('inboxZeroBulkFailed'));
      } finally {
        setBusy(false);
      }
    },
    [selectedIds, selectedRows, templateId, reassignCounselorId, t],
  );

  const submitSingleDismiss = async () => {
    if (!singleDismissRow || !singleNote.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetchWithTimeout('/api/counselor/inbox-zero/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: singleDismissRow.memberId,
          reason: singleNote.trim(),
          flags: [singleDismissRow.primaryFlag, ...singleDismissRow.additionalFlags],
        }),
      }, 15000);
      if (!res.ok) throw new Error('dismiss failed');
      setSingleDismissRow(null);
      setSingleNote('');
      await refreshQueue();
    } catch {
      setError(t('inboxZeroDismissFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (queue.rows.length === 0) {
    return (
      <PortalEmptyState
        title={t('inboxZeroClearTitle')}
        description={t('inboxZeroClearDesc')}
        icon={
          <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: 'var(--color-green)' }} aria-hidden="true">
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
      {selectedIds.size > 0 ? (
        <div
          className="content-card"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {t('inboxZeroBulkSelected', { count: selectedIds.size })}
          </span>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value as FollowUpTemplateId | '')}
            disabled={busy}
            aria-label={t('inboxZeroBulkTemplateLabel')}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem', maxWidth: 220 }}
          >
            <option value="">{t('inboxZeroBulkTemplatePlaceholder')}</option>
            {applicableTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
            ))}
          </select>
          <button type="button" className="btn btn-primary btn-sm" disabled={busy || !templateId} onClick={() => runBulk('follow_up')}>
            {t('inboxZeroBulkSendFollowUp')}
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => runBulk('mark_contacted')}>
            {t('inboxZeroBulkMarkContacted')}
          </button>
          <select
            value={reassignCounselorId}
            onChange={(e) => setReassignCounselorId(e.target.value)}
            disabled={busy}
            aria-label={t('inboxZeroBulkReassignLabel')}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem', maxWidth: 200 }}
          >
            <option value="">{t('inboxZeroBulkReassignPlaceholder')}</option>
            {counselors.map((c) => (
              <option key={c.userId} value={c.userId}>{c.fullName}</option>
            ))}
          </select>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy || !reassignCounselorId} onClick={() => runBulk('reassign')}>
            {t('inboxZeroBulkReassign')}
          </button>
          <button type="button" className="btn btn-muted btn-sm" disabled={busy} onClick={() => { setBulkNote(''); setBulkModal('dismiss'); }}>
            {t('inboxZeroBulkDismiss')}
          </button>
          <button type="button" className="btn btn-muted btn-sm" disabled={busy} onClick={clearSelection}>
            {t('inboxZeroBulkClear')}
          </button>
        </div>
      ) : null}

      {resultMsg ? (
        <p style={{ margin: '0 0 1rem', padding: '0.6rem 0.75rem', background: 'color-mix(in srgb, var(--color-green) 12%, transparent)', borderRadius: 6, fontSize: '0.85rem' }}>
          {resultMsg}
        </p>
      ) : null}
      {error ? <p style={{ margin: '0 0 1rem', color: 'var(--color-accent)', fontSize: '0.85rem' }}>{error}</p> : null}

      <div className="content-card" style={{ padding: '1rem 1.25rem', marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selectedIds.size === queue.rows.length}
            ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < queue.rows.length; }}
            onChange={toggleSelectAll}
            aria-label={t('inboxZeroSelectAll')}
          />
          {t('inboxZeroSelectAll')}
        </label>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
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
            selected={selectedIds.has(row.memberId)}
            onToggleSelect={() => toggleSelect(row.memberId)}
            onDismiss={() => { setSingleDismissRow(row); setSingleNote(''); setError(null); }}
            dismissing={busy && singleDismissRow?.memberId === row.memberId}
          />
        ))}
      </ul>

      {bulkModal === 'dismiss' ? (
        <DismissModal
          title={t('inboxZeroBulkDismissTitle', { count: selectedIds.size })}
          note={bulkNote}
          onNoteChange={setBulkNote}
          busy={busy}
          error={error}
          onClose={() => !busy && setBulkModal(null)}
          onConfirm={() => runBulk('dismiss', { reason: bulkNote })}
        />
      ) : null}
      {singleDismissRow ? (
        <DismissModal
          title={t('inboxZeroDismissTitle', { name: singleDismissRow.memberName })}
          note={singleNote}
          onNoteChange={setSingleNote}
          busy={busy}
          error={error}
          onClose={() => !busy && setSingleDismissRow(null)}
          onConfirm={submitSingleDismiss}
        />
      ) : null}
    </>
  );
}

function DismissModal({
  title,
  note,
  onNoteChange,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  title: string;
  note: string;
  onNoteChange: (v: string) => void;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('counselor');
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-dismiss-title"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', padding: '1rem' }}
      onClick={onClose}
    >
      <div className="content-card" style={{ maxWidth: 480, width: '100%', padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
        <h2 id="inbox-dismiss-title" style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{title}</h2>
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>{t('inboxZeroDismissDesc')}</p>
        <label htmlFor="inbox-dismiss-note" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          {t('inboxZeroDismissNoteLabel')}
        </label>
        <textarea
          id="inbox-dismiss-note"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={t('inboxZeroDismissNotePlaceholder')}
          style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid var(--color-outline-variant)', fontSize: '0.9rem', resize: 'vertical' }}
        />
        {error ? <p style={{ margin: '0.5rem 0 0', color: 'var(--color-accent)', fontSize: '0.85rem' }}>{error}</p> : null}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-muted" disabled={busy} onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="btn btn-primary" disabled={busy || !note.trim()} onClick={onConfirm}>
            {busy ? t('saving') : t('inboxZeroDismissConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

function InboxZeroRowCard({
  row,
  selected,
  onToggleSelect,
  onDismiss,
  dismissing,
}: {
  row: InboxZeroRow;
  selected: boolean;
  onToggleSelect: () => void;
  onDismiss: () => void;
  dismissing: boolean;
}) {
  const t = useTranslations('counselor');
  const programLabel = row.enrolledProgram
    ? getProgramBySlug(row.enrolledProgram)?.title ?? row.enrolledProgram
    : t('notEnrolled');
  const priorityColor =
    row.priorityRank === 0 ? 'var(--color-accent, #b00020)'
      : row.priorityRank === 1 ? 'var(--color-gold, #b07d2c)'
        : 'var(--color-blue, #1f6feb)';
  const metadata = formatRowMetadata(row);

  return (
    <li
      className="content-card"
      style={{
        padding: '0.75rem 1rem',
        borderLeft: `4px solid ${priorityColor}`,
        background: selected ? 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))' : undefined,
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.65rem', minWidth: 0, flex: 1 }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={t('inboxZeroSelectMember', { name: row.memberName })}
            style={{ width: 44, height: 44, margin: '-10px 0', flexShrink: 0, cursor: 'pointer' }}
          />
          <div style={{ minWidth: 0 }}>
            <Link href={`/counselor/students/${row.memberId}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>
              {row.memberName}
            </Link>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
              {row.memberEmail} · {programLabel}
            </p>
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
              <strong>{INBOX_FLAG_LABELS[row.primaryFlag]}</strong>
              {metadata ? <span style={{ color: 'var(--color-on-surface-variant)' }}> · {metadata}</span> : null}
            </p>
            {row.additionalFlags.length > 0 ? (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                {t('inboxZeroAlso')}: {row.additionalFlags.map((f) => INBOX_FLAG_LABELS[f]).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href={`/counselor/students/${row.memberId}`} className="btn btn-muted" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
            {t('openMember')}
          </Link>
          <button type="button" className="btn btn-muted" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }} disabled={dismissing} onClick={onDismiss}>
            {dismissing ? t('saving') : t('inboxZeroDismiss')}
          </button>
        </div>
      </div>
    </li>
  );
}

function formatRowMetadata(row: InboxZeroRow): string | null {
  const parts: string[] = [];
  if (row.context.atRiskScore !== undefined) parts.push(`risk ${row.context.atRiskScore}`);
  if (row.context.daysSinceAssignment !== undefined) parts.push(`${row.context.daysSinceAssignment}d since assigned`);
  if (row.context.daysSinceApplication !== undefined) parts.push(`${row.context.daysSinceApplication}d on application`);
  if (row.context.daysSinceLastContact !== undefined) parts.push(`${row.context.daysSinceLastContact}d since contact`);
  return parts.length > 0 ? parts.join(' · ') : null;
}
