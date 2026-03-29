'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type PlacedOutcomeInitial = {
  employerName: string;
  jobTitle: string;
  startingSalary: number | null;
  placedAt: string;
  programSlug: string | null;
  notes: string | null;
} | null;

export default function AdminMemberPlacedOutcomeForm({
  memberId,
  initial,
}: {
  memberId: string;
  initial: PlacedOutcomeInitial;
}) {
  const router = useRouter();
  const [employerName, setEmployerName] = useState(initial?.employerName ?? '');
  const [jobTitle, setJobTitle] = useState(initial?.jobTitle ?? '');
  const [startingSalary, setStartingSalary] = useState(
    initial?.startingSalary != null ? String(initial.startingSalary) : ''
  );
  const [placedAt, setPlacedAt] = useState(
    initial?.placedAt ? initial.placedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [programSlug, setProgramSlug] = useState(initial?.programSlug ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const salaryRaw = startingSalary.trim();
    const startingSalaryNum =
      salaryRaw === '' ? null : Number.parseInt(salaryRaw.replace(/,/g, ''), 10);
    if (salaryRaw !== '' && (Number.isNaN(startingSalaryNum) || startingSalaryNum! < 0)) {
      setMsg({ type: 'err', text: 'Starting salary must be a whole number (annual USD) or empty.' });
      setSaving(false);
      return;
    }
    const placedIso = new Date(placedAt + 'T12:00:00.000Z').toISOString();
    try {
      const r = await fetch(`/api/admin/members/${memberId}/placed-outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employerName: employerName.trim(),
          jobTitle: jobTitle.trim(),
          startingSalary: startingSalaryNum,
          placedAt: placedIso,
          programSlug: programSlug.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg({ type: 'err', text: typeof data.error === 'string' ? data.error : 'Save failed' });
        return;
      }
      setMsg({ type: 'ok', text: 'Placement saved for grant reporting.' });
      router.refresh();
    } catch {
      setMsg({ type: 'err', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {msg ? (
        <p style={{ fontSize: '0.9rem', color: msg.type === 'ok' ? '#166534' : '#b91c1c' }} role="status">
          {msg.text}
        </p>
      ) : null}
      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
        WorkforceAP-reported placement for funders (separate from counselor placement notes).
      </p>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="po-employer">Employer name *</label>
        <input
          id="po-employer"
          className="form-control"
          value={employerName}
          onChange={(e) => setEmployerName(e.target.value)}
          required
          maxLength={300}
          disabled={saving}
        />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="po-title">Job title *</label>
        <input
          id="po-title"
          className="form-control"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          required
          maxLength={300}
          disabled={saving}
        />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="po-salary">Starting salary (annual USD, optional)</label>
        <input
          id="po-salary"
          className="form-control"
          type="text"
          inputMode="numeric"
          value={startingSalary}
          onChange={(e) => setStartingSalary(e.target.value)}
          placeholder="e.g. 55000"
          disabled={saving}
        />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="po-date">Placement date *</label>
        <input
          id="po-date"
          className="form-control"
          type="date"
          value={placedAt}
          onChange={(e) => setPlacedAt(e.target.value)}
          required
          disabled={saving}
        />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="po-program">Program slug (optional)</label>
        <input
          id="po-program"
          className="form-control"
          value={programSlug}
          onChange={(e) => setProgramSlug(e.target.value)}
          maxLength={120}
          disabled={saving}
          placeholder="e.g. google-it-support"
        />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label htmlFor="po-notes">Notes (optional)</label>
        <textarea
          id="po-notes"
          className="form-control"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={8000}
          disabled={saving}
        />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
        {saving ? 'Saving…' : initial ? 'Update placement record' : 'Save placement'}
      </button>
    </form>
  );
}
