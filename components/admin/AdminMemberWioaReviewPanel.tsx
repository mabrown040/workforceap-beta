'use client';

import { useState } from 'react';
import type { WioaQualificationSnapshot } from '@/lib/wioa/wioaQualification';
import { barrierLabel } from '@/lib/wioa/wioaQualification';
import { WIOA_REVIEW_LABELS, WIOA_REVIEW_STATUSES, type WioaReviewStatus } from '@/lib/wioa/wioaReview';

type Props = {
  memberId: string;
  snapshot: WioaQualificationSnapshot;
  reviewStatus: WioaReviewStatus | null;
  reviewedAt: string | null;
  reviewerName: string | null;
  reviewNotes: string | null;
};

const AGE_LABEL: Record<string, string> = {
  under18: 'Under 18',
  '18_24': '18–24',
  '25_54': '25–54',
  '55_plus': '55+',
};

export default function AdminMemberWioaReviewPanel({
  memberId,
  snapshot,
  reviewStatus,
  reviewedAt,
  reviewerName,
  reviewNotes,
}: Props) {
  const [status, setStatus] = useState<WioaReviewStatus>(reviewStatus ?? 'pending');
  const [notes, setNotes] = useState(reviewNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [savedAt, setSavedAt] = useState(reviewedAt);
  const [savedReviewer, setSavedReviewer] = useState(reviewerName);

  const onSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await fetch(`/api/admin/members/${memberId}/wioa-review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes: notes || null }),
      });
      const data = (await res.json()) as { error?: string; wioaReviewedAt?: string };
      if (!res.ok) {
        setErr(data.error ?? 'Save failed');
        return;
      }
      if (data.wioaReviewedAt) setSavedAt(data.wioaReviewedAt);
      setSavedReviewer('You');
    } catch {
      setErr('Network error');
    } finally {
      setSaving(false);
    }
  };

  const a = snapshot.answers;

  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>WIOA self-screening</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', lineHeight: 1.45 }}>
        Member-submitted questionnaire. Heuristic signal is not a legal determination. Use review status for internal workflow
        only.
      </p>

      <p style={{ marginBottom: '0.35rem' }}>
        <strong>Submitted:</strong> {new Date(snapshot.submittedAt).toLocaleString()}
      </p>
      <p style={{ marginBottom: '0.35rem' }}>
        <strong>Portal signal:</strong> {snapshot.signal}
      </p>
      <p style={{ marginBottom: '0.75rem' }}>
        <strong>County / ZIP:</strong> {a.countyOrZip?.trim() || '—'}
      </p>

      <ul style={{ fontSize: '0.9rem', marginBottom: '1rem', paddingLeft: '1.25rem', lineHeight: 1.5 }}>
        <li>
          <strong>Age group:</strong> {AGE_LABEL[a.ageBracket] ?? a.ageBracket}
        </li>
        <li>
          <strong>Primary barrier:</strong> {barrierLabel(a.primaryBarrier)}
        </li>
        <li>
          <strong>Dislocated worker:</strong> {a.dislocatedWorker ? 'Yes' : 'No'}
        </li>
        <li>
          <strong>Low income (self-reported):</strong> {a.lowIncomeSelfReport ? 'Yes' : 'No'}
        </li>
        <li>
          <strong>Training interest:</strong> {a.trainingInterest ? 'Yes' : 'No'}
        </li>
        <li>
          <strong>Intake complete (self-reported):</strong> {a.completedIntakeSelfReport ? 'Yes' : 'No'}
        </li>
      </ul>

      <details style={{ marginBottom: '1rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Reasons shown to member</summary>
        <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', fontSize: '0.88rem' }}>
          {snapshot.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </details>

      <div style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}>
        <label htmlFor="wioa-review-status" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
          Staff review status
        </label>
        <select
          id="wioa-review-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as WioaReviewStatus)}
          style={{ width: '100%', maxWidth: '320px', padding: '0.5rem', marginBottom: '0.75rem', borderRadius: '6px' }}
        >
          {WIOA_REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {WIOA_REVIEW_LABELS[s]}
            </option>
          ))}
        </select>

        <label htmlFor="wioa-review-notes" style={{ display: 'block', fontWeight: 600, marginBottom: '0.35rem' }}>
          Internal notes
        </label>
        <textarea
          id="wioa-review-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Documentation, follow-ups, AJC referral, etc."
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '6px',
            fontFamily: 'inherit',
            marginBottom: '0.75rem',
          }}
        />

        {err ? (
          <p role="alert" style={{ color: '#b91c1c', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {err}
          </p>
        ) : null}

        <button type="button" className="btn btn-primary" onClick={() => void onSave()} disabled={saving} aria-busy={saving}>
          <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {saving ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', animation: 'spin 1s linear infinite' }} aria-hidden="true">progress_activity</span>
                Saving…
              </>
            ) : (
              'Save review'
            )}
          </span>
        </button>

        {savedAt && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
            Last saved: {new Date(savedAt).toLocaleString()}
            {savedReviewer ? ` · ${savedReviewer}` : ''}
          </p>
        )}
      </div>
    </section>
  );
}
