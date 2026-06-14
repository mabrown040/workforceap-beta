'use client';

import { useState, useEffect } from 'react';
import { Users, X, AlertCircle } from 'lucide-react';

const PIPELINE_STAGES = [
  { value: '', label: '— No change —' },
  { value: 'applied', label: 'Applied' },
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'in_training', label: 'In Training' },
  { value: 'certified', label: 'Certified' },
  { value: 'job_searching', label: 'Job Searching' },
  { value: 'placed', label: 'Placed' },
];

type Counselor = { userId: string; fullName: string; partnerName: string | null };
type Program = { slug: string; title: string };

type Props = {
  open: boolean;
  memberIds: string[];
  programs: Program[];
  onClose: () => void;
  onUpdated: (result: { updated: number; total: number; errors: string[] }) => void;
};

export default function BulkUpdateModal({ open, memberIds, programs, onClose, onUpdated }: Props) {
  const [pipelineStage, setPipelineStage] = useState('');
  const [counselorUserId, setCounselorUserId] = useState('');
  const [programSlug, setProgramSlug] = useState('');
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loadingCounselors, setLoadingCounselors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPipelineStage('');
      setCounselorUserId('');
      setProgramSlug('');
      setError(null);
      setSaving(false);
      setLoadingCounselors(true);
      fetch('/api/admin/counselors', { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          if (d.counselors) {
            setCounselors(d.counselors.map((c: { userId: string; fullName: string; partnerName?: string | null }) => ({
              userId: c.userId,
              fullName: c.fullName,
              partnerName: c.partnerName ?? null,
            })));
          }
        })
        .catch(() => setCounselors([]))
        .finally(() => setLoadingCounselors(false));
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasUpdate = pipelineStage !== '' || counselorUserId !== '' || programSlug !== '';
    if (!hasUpdate) { setError('Select at least one field to update.'); return; }

    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = { memberIds };
    if (pipelineStage !== '') payload.pipelineStage = pipelineStage === '__null' ? null : pipelineStage;
    if (counselorUserId !== '') payload.counselorUserId = counselorUserId === '__null' ? null : counselorUserId;
    if (programSlug !== '') payload.programSlug = programSlug === '__null' ? null : programSlug;

    try {
      const res = await fetch('/api/admin/members/bulk-update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Update failed. Please try again.');
        return;
      }
      onUpdated(data);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-update-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-lg, 1rem)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-xl, 0 20px 40px rgba(0,0,0,0.25))',
        }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--outline-variant, #e5e0dc)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} style={{ color: 'var(--color-accent)' }} />
            <h2 id="bulk-update-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800 }}>
              Bulk Update
            </h2>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              padding: '0.625rem 0.875rem',
              borderRadius: '0.625rem',
              background: 'rgba(173,44,77,0.1)',
              color: 'var(--color-accent)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
            <strong>{memberIds.length}</strong> member{memberIds.length === 1 ? '' : 's'} selected.
            Choose the fields you want to update. Empty fields will not be changed.
          </p>

          <div>
            <label htmlFor="bulkupdatemodal-pipeline-stage-field" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.375rem' }}>
              Pipeline Stage
            </label>
            <select id="bulkupdatemodal-pipeline-stage-field"
              value={pipelineStage}
              onChange={(e) => setPipelineStage(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                fontSize: '0.875rem',
              }}
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulkupdatemodal-counselor-field" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.375rem' }}>
              Counselor
            </label>
            <select id="bulkupdatemodal-counselor-field"
              value={counselorUserId}
              onChange={(e) => setCounselorUserId(e.target.value)}
              disabled={loadingCounselors}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">— No change —</option>
              <option value="__null">— Unassign —</option>
              {counselors.map((c) => (
                <option key={c.userId} value={c.userId}>
                  {c.fullName}{c.partnerName ? ` (${c.partnerName})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="bulkupdatemodal-program-field" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '0.375rem' }}>
              Program
            </label>
            <select id="bulkupdatemodal-program-field"
              value={programSlug}
              onChange={(e) => setProgramSlug(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--surface-container)',
                color: 'var(--color-on-surface)',
                fontSize: '0.875rem',
              }}
            >
              <option value="">— No change —</option>
              <option value="__null">— Clear program —</option>
              {programs.map((p) => (
                <option key={p.slug} value={p.slug}>{p.title}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {saving && (
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">
                    progress_activity
                  </span>
                )}
                {saving ? 'Updating…' : 'Update'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
