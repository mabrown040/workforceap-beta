'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postMemberEvent } from '@/lib/events/client';
import { trackFunnelEvent } from '@/lib/analytics/events';

type Job = {
  id: string;
  title: string;
  location: string | null;
  locationType: string;
  jobType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  sourceUrl?: string | null;
  importProvider?: string | null;
  importMethod?: string | null;
  requirements: string[];
  preferredCertifications: string[];
  suggestedPrograms: string[];
  status: string;
  applicationsCount: number;
  aiMatchesComputedAt?: string | Date | null;
  matchSuggestionsLastSentAt?: string | Date | null;
  matchSuggestionsLastStatus?: string | null;
  matchSuggestionsLastError?: string | null;
  employer?: { companyName: string; contactEmail: string; contactName: string | null } | null;
  applications?: { id: string; student: { fullName: string; email: string } }[];
};

function formatAdminDate(value: string | Date | null | undefined): string {
  if (value == null) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function matchEmailBadgeStyle(status: string | null | undefined): { bg: string; color: string; label: string } {
  switch (status) {
    case 'success':
    case 'test_sent':
      return { bg: 'rgba(74, 155, 79, 0.15)', color: '#2d6a32', label: status === 'test_sent' ? 'Test sent' : 'Success' };
    case 'failed':
      return { bg: 'rgba(220, 38, 38, 0.12)', color: '#b91c1c', label: 'Failed' };
    case 'dry_run':
      return { bg: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8', label: 'Dry run' };
    default:
      return { bg: 'var(--surface-container)', color: 'var(--color-on-surface)', label: status ? status : 'None' };
  }
}

function formatImportMethod(importMethod?: string | null) {
  if (!importMethod) return null;
  return importMethod
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AdminJobReview({ job }: { job: Job }) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
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
  const hasProvenance = !!(job.sourceUrl || job.importProvider || job.importMethod);
  const suggestionBadge = matchEmailBadgeStyle(job.matchSuggestionsLastStatus);

  useEffect(() => {
    trackFunnelEvent('admin_review_queue', 'job_review_opened', { job_id: job.id, status: job.status });
    void postMemberEvent({
      eventName: 'admin_job_review_viewed',
      entityType: 'job',
      entityId: job.id,
      sourcePage: `/admin/jobs/${job.id}`,
      metadata: { status: job.status },
    });
  }, [job.id, job.status]);

  async function handleApprove() {
    setApproving(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/approve`, { method: 'POST' });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Job approved.' });
        router.refresh();
      } else {
        setActionFeedback({ type: 'error', message: 'Failed to approve. Try again.' });
      }
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setRejectReasonError('Please enter a rejection reason before rejecting.');
      return;
    }
    setRejectReasonError('');
    setRejecting(true);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setActionFeedback({ type: 'success', message: 'Job rejected.' });
        router.refresh();
      } else {
        setActionFeedback({ type: 'error', message: 'Failed to reject. Try again.' });
      }
    } finally {
      setRejecting(false);
    }
  }

  async function loadMatches() {
    setLoadingMatches(true);
    trackFunnelEvent('admin_review_queue', 'matches_requested', { job_id: job.id });
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
    trackFunnelEvent('admin_review_queue', 'match_suggestions_requested', { job_id: job.id });
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/suggest-matches`, { method: 'POST' });
      const d = (await res.json().catch(() => ({}))) as {
        error?: string;
        dryRun?: boolean;
        testMode?: boolean;
        employerNotifiedUpdate?: string;
      };
      if (res.ok) {
        if (d.dryRun) {
          setActionFeedback({
            type: 'success',
            message: 'Dry run complete — no email was sent. Check audit / job timestamps.',
          });
        } else {
          const parts = [
            d.testMode ? 'Sent to test inbox (ADMIN_MATCH_SUGGESTIONS_TEST_EMAIL).' : 'Match suggestions sent to employer.',
          ];
          if (d.employerNotifiedUpdate === 'failed') {
            parts.push('Warning: email may have delivered but applicant statuses did not update — see logs.');
          }
          setActionFeedback({ type: 'success', message: parts.join(' ') });
        }
        router.refresh();
      } else {
        setActionFeedback({
          type: 'error',
          message: typeof d.error === 'string' ? d.error : 'Failed to send suggestions.',
        });
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
      <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
        {job.employer?.companyName ?? 'Unknown'} · {job.employer?.contactName ?? job.employer?.contactEmail ?? '—'} · Status: {job.status}
      </p>

      {hasProvenance && (
        <section
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'var(--color-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Import provenance</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.95rem' }}>
            {job.importProvider && (
              <>
                <dt style={{ color: 'var(--color-on-surface-variant)' }}>Provider</dt>
                <dd>{job.importProvider}</dd>
              </>
            )}
            {job.importMethod && (
              <>
                <dt style={{ color: 'var(--color-on-surface-variant)' }}>Method</dt>
                <dd>{formatImportMethod(job.importMethod)}</dd>
              </>
            )}
            {job.sourceUrl && (
              <>
                <dt style={{ color: 'var(--color-on-surface-variant)' }}>Source</dt>
                <dd>
                  <a href={job.sourceUrl} target="_blank" rel="noreferrer">{job.sourceUrl}</a>
                </dd>
              </>
            )}
          </dl>
        </section>
      )}

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  aria-label="Rejection reason"
                  placeholder="Rejection reason"
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectReasonError) setRejectReasonError('');
                  }}
                  aria-invalid={!!rejectReasonError}
                  aria-describedby={rejectReasonError ? 'admin-job-reject-reason-error' : undefined}
                  style={{ flex: 1, minWidth: '12rem', padding: '0.5rem' }}
                />
                <button type="button" className="btn btn-ghost" onClick={handleReject} disabled={rejecting}>
                  {rejecting ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
              {rejectReasonError ? (
                <p id="admin-job-reject-reason-error" style={{ margin: 0, fontSize: '0.85rem', color: '#b91c1c' }}>
                  {rejectReasonError}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Details</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem', fontSize: '0.95rem' }}>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Location</dt>
          <dd>{job.location ?? '—'}</dd>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Type</dt>
          <dd>{job.jobType} · {job.locationType}</dd>
          <dt style={{ color: 'var(--color-on-surface-variant)' }}>Salary</dt>
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
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No applications yet.</p>
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
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>AI Member Matches</h2>
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.85rem 1rem',
            background: 'var(--surface-container-lowest)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
          }}
        >
          {job.status === 'pending' && !job.aiMatchesComputedAt && (
            <p style={{ margin: '0 0 0.65rem', color: 'var(--color-on-surface)', fontSize: '0.88rem' }}>
              Member matches are calculated automatically when you approve this job (they may show as &quot;None&quot; until then).
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 1rem', marginBottom: '0.35rem' }}>
            <span style={{ color: 'var(--color-on-surface-variant)' }}>Matches calculated at</span>
            <strong>{formatAdminDate(job.aiMatchesComputedAt)}</strong>
            <span
              style={{
                marginLeft: 'auto',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: suggestionBadge.bg,
                color: suggestionBadge.color,
              }}
            >
              {suggestionBadge.label}
            </span>
          </div>
          <div style={{ color: 'var(--color-on-surface-variant)' }}>
            Last suggestion email: <strong>{formatAdminDate(job.matchSuggestionsLastSentAt)}</strong>
          </div>
          {job.matchSuggestionsLastError && (
            <p style={{ margin: '0.5rem 0 0', color: '#b91c1c', fontSize: '0.85rem' }}>
              Last error: {job.matchSuggestionsLastError}
            </p>
          )}
        </div>
        {!matches ? (
          <button
            type="button"
            className="btn btn-muted"
            onClick={loadMatches}
            disabled={loadingMatches}
          >
            {loadingMatches ? 'Loading…' : 'View AI Matches'}
          </button>
        ) : (
          <>
            {matches.length === 0 ? (
              <p style={{ color: 'var(--color-on-surface-variant)' }}>No matching members found.</p>
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
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
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
                    {suggesting ? 'Sending…' : 'Send Match Suggestions to Employer'}
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
