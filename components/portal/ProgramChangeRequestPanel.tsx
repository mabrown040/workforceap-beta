'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Program } from '@/lib/content/programs';

type RequestRow = {
  id: string;
  requestedProgramSlug: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export default function ProgramChangeRequestPanel({
  currentSlug,
  alternatives,
}: {
  currentSlug: string;
  alternatives: Program[];
}) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const selectable = useMemo(
    () => alternatives.filter((p) => p.slug !== currentSlug),
    [alternatives, currentSlug]
  );
  const [requestedSlug, setRequestedSlug] = useState(() => selectable[0]?.slug ?? '');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reload = useCallback(async () => {
    const r = await fetch('/api/member/program-change-request');
    const d = await r.json();
    setRequests(d.requests ?? []);
  }, []);

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    const next = selectable[0]?.slug;
    if (next && !selectable.some((p) => p.slug === requestedSlug)) {
      setRequestedSlug(next);
    }
  }, [selectable, requestedSlug]);

  const pending = requests.find((r) => r.status === 'PENDING');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/member/program-change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedProgramSlug: requestedSlug, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not submit');
        return;
      }
      setReason('');
      setSuccess(true);
      await reload();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading requests…</p>;
  }

  return (
    <section
      style={{
        marginTop: '2rem',
        padding: '1.25rem',
        border: '1px solid var(--outline-variant)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Change program</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
        Funding is tied to one program. To switch, submit a request — staff will review and follow up.
      </p>

      {pending && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(140, 15, 55, 0.08)',
            border: '1px solid rgba(140, 15, 55, 0.25)',
            fontSize: '0.9rem',
          }}
        >
          <strong>Pending review:</strong> you asked to move to{' '}
          <strong>{pending.requestedProgramSlug}</strong> (submitted{' '}
          {new Date(pending.createdAt).toLocaleDateString()}).
        </div>
      )}

      {requests.filter((r) => r.status !== 'PENDING').length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem', fontSize: '0.85rem' }}>
          {requests
            .filter((r) => r.status !== 'PENDING')
            .map((r) => (
              <li key={r.id} style={{ marginBottom: '0.5rem', color: 'var(--color-on-surface-variant)' }}>
                <strong>{r.status}</strong> — {r.requestedProgramSlug}
                {r.reviewedAt && ` · ${new Date(r.reviewedAt).toLocaleDateString()}`}
                {r.adminNote && (
                  <span style={{ display: 'block', marginTop: '0.25rem' }}>Note: {r.adminNote}</span>
                )}
              </li>
            ))}
        </ul>
      )}

      {!pending && selectable.length > 0 && (
        <form onSubmit={submit}>
          <label htmlFor="program-change-select" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Requested program
          </label>
          <select
            id="program-change-select"
            value={requestedSlug || selectable[0]?.slug}
            onChange={(e) => setRequestedSlug(e.target.value)}
            style={{
              width: '100%',
              maxWidth: '24rem',
              padding: '0.5rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline-variant)',
            }}
          >
            {selectable.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>

          <label htmlFor="program-change-reason" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
            Why are you switching? (required)
          </label>
          <textarea
            id="program-change-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            required
            minLength={10}
            placeholder="Briefly explain your goals and why this program is a better fit."
            style={{
              width: '100%',
              padding: '0.6rem 0.75rem',
              marginBottom: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline-variant)',
              fontSize: '0.9rem',
            }}
          />

          {error && <p className="form-error" role="alert" style={{ marginBottom: '0.5rem' }}>{error}</p>}
          {success && !pending && (
            <p style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              Request submitted. We&rsquo;ll notify you when it&rsquo;s reviewed.
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || reason.trim().length < 10}
            aria-busy={submitting}
          >
            <span aria-live="polite">
              {submitting ? 'Submitting…' : 'Submit request'}
            </span>
          </button>
        </form>
      )}

      {!pending && selectable.length === 0 && (
        <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          No other programs are available to switch to right now. Contact your counselor if you need help.
        </p>
      )}
    </section>
  );
}
