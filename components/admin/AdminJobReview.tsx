'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Job = {
  id: string;
  title: string;
  location: string | null;
  locationType: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  requirements: string[];
  preferredCertifications: string[];
  suggestedPrograms: string[];
  status: string;
  applicationsCount: number;
  employer?: { companyName: string; contactEmail: string; contactName: string | null } | null;
  applications?: { id: string; student: { fullName: string; email: string } }[];
};

export default function AdminJobReview({ job }: { job: Job }) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matches, setMatches] = useState<Array<{
    studentId: string;
    matchScore: number;
    matchReasons: string[];
    student: { fullName: string; email: string; enrolledProgram: string | null };
  }> | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canApprove = job.status === 'pending';
  const canReject = job.status === 'pending';

  async function handleApprove() {
    setApproving(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/approve`, { method: 'POST' });
      if (res.ok) router.refresh();
      else setActionFeedback({ type: 'error', message: 'Failed to approve. Try again.' });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setActionFeedback({ type: 'error', message: 'Please enter a rejection reason.' });
      return;
    }
    setRejecting(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) router.refresh();
      else setActionFeedback({ type: 'error', message: 'Failed to reject. Try again.' });
    } finally {
      setRejecting(false);
    }
  }

  async function loadMatches() {
    setLoadingMatches(true);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/matches`);
      const data = await res.json();
      if (res.ok) setMatches(data);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function handleSuggestMatches() {
    setSuggesting(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/suggest-matches`, { method: 'POST' });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Match suggestions sent to employer.' });
        router.refresh();
      } else {
        const d = await res.json();
        setActionFeedback({ type: 'error', message: typeof d.error === 'string' ? d.error : 'Failed to send suggestions.' });
      }
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div>
      {actionFeedback && (
        <div
          className={`admin-inline-feedback ${actionFeedback.type === 'success' ? 'admin-inline-feedback--success' : 'admin-inline-feedback--error'}`}
          role="status"
        >
          <p>{actionFeedback.message}</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setActionFeedback(null)}>
            Dismiss
          </button>
        </div>
      )}
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{job.title}</h1>
      <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
        {job.employer?.companyName ?? 'Unknown'} · {job.employer?.contactName ?? job.employer?.contactEmail ?? '—'} · Status: {job.status}
      </p>

      {(canApprove || canReject) && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1rem',
            background: 'var(--color-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          {canApprove && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={approving}
            >
              {approving ? 'Approving…' : 'Approve'}
            </button>
          )}
          {canReject && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
              <input
                type="text"
                placeholder="Rejection reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ flex: 1, padding: '0.5rem' }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
              >
                {rejecting ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          )}
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Details</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.95rem' }}>
          <dt style={{ color: 'var(--color-gray-500)' }}>Location</dt>
          <dd>{job.location ?? '—'}</dd>
          <dt style={{ color: 'var(--color-gray-500)' }}>Type</dt>
          <dd>{job.jobType} · {job.locationType}</dd>
          <dt style={{ color: 'var(--color-gray-500)' }}>Salary</dt>
          <dd>
            {job.salaryMin ?? job.salaryMax
              ? `$${(job.salaryMin ?? 0).toLocaleString()} – $${(job.salaryMax ?? 0).toLocaleString()}`
              : '—'}
          </dd>
        </dl>
        <div style={{ marginTop: '1rem' }}>
          <strong>Description</strong>
          <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', fontSize: '0.95rem' }}>{job.description}</div>
        </div>
        {(job.requirements?.length ?? 0) > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <strong>Requirements</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              {job.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Applications ({job.applications?.length ?? 0})</h2>
        {(job.applications?.length ?? 0) === 0 ? (
          <p style={{ color: 'var(--color-gray-500)' }}>No applications yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {(job.applications ?? []).map((app) => (
              <li
                key={app.id}
                style={{
                  padding: '0.75rem',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  <strong>{app.student?.fullName ?? 'Unknown'}</strong> · {app.student?.email ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="matches" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>AI Student Matches</h2>
        {!matches ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadMatches}
            disabled={loadingMatches}
          >
            {loadingMatches ? 'Loading…' : 'View AI Matches'}
          </button>
        ) : (
          <>
            {matches.length === 0 ? (
              <p style={{ color: 'var(--color-gray-500)' }}>No matching students found.</p>
            ) : (
              <>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '1rem' }}>
                  {matches.map((m) => (
                    <li
                      key={m.studentId}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <strong>{m.student.fullName}</strong> · {m.student.enrolledProgram ?? '—'} · Match: {m.matchScore}%
                      {m.matchReasons.length > 0 && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginTop: '0.25rem' }}>
                          {m.matchReasons.join('; ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {job.status === 'live' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSuggestMatches}
                    disabled={suggesting}
                  >
                    {suggesting ? 'Sending…' : 'Suggest Matches to Employer'}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
