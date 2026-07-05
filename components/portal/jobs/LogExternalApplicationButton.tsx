'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import ApplicationAiFeedbackPrompt from '@/components/portal/ApplicationAiFeedbackPrompt';
import type { RecentToolOption } from '@/components/portal/ApplicationAiFeedbackPrompt';

/**
 * "I applied somewhere else — log it" CTA + modal form.
 *
 * Per /plan-ceo-review (2026-04-26): closes the placement-tracking gap.
 * Member finds a job on Indeed/LinkedIn, applies there, comes back to
 * WorkforceAP and logs the apply in 30 seconds without leaving the Job
 * Board page. Counselor gets notified automatically.
 */
type Source = 'INDEED' | 'LINKEDIN' | 'GLASSDOOR' | 'ZIPRECRUITER' | 'WORKINTEXAS' | 'AUSTINJOBS' | 'DIRECT' | 'OTHER';

const SOURCE_OPTIONS: Array<{ value: Source; label: string }> = [
  { value: 'OTHER', label: 'Somewhere else' },
  { value: 'INDEED', label: 'Indeed' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'GLASSDOOR', label: 'Glassdoor' },
  { value: 'ZIPRECRUITER', label: 'ZipRecruiter' },
  { value: 'WORKINTEXAS', label: 'WorkInTexas' },
  { value: 'AUSTINJOBS', label: 'AustinJobs.com' },
  { value: 'DIRECT', label: 'Company site' },
];

export default function LogExternalApplicationButton({ variant = 'secondary' }: { variant?: 'primary' | 'secondary' } = {}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedbackAppId, setFeedbackAppId] = useState<string | null>(null);
  const [feedbackTools, setFeedbackTools] = useState<RecentToolOption[]>([]);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState<Source>('OTHER');
  const [notes, setNotes] = useState('');

  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
      // Focus first field after dialog renders
      setTimeout(() => firstFieldRef.current?.focus(), 50);
    } else if (!open && dlg.open) {
      dlg.close();
    }
  }, [open]);

  const reset = () => {
    setCompany('');
    setRole('');
    setUrl('');
    setSource('OTHER');
    setNotes('');
    setSavedAt(null);
    setError(null);
    setFeedbackAppId(null);
    setFeedbackTools([]);
  };

  const close = () => {
    setOpen(false);
    // Wait briefly so closing animation doesn't reset visible content
    setTimeout(reset, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/member/job-applications/log-external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          role: role.trim(),
          url: url.trim() || undefined,
          source,
          notes: notes.trim() || undefined})});
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not log application. Try again.');
        setSubmitting(false);
        return;
      }
      setSavedAt(data.appliedAt ? new Date(data.appliedAt) : new Date());
      if (data.promptAiFeedback && data.applicationId && Array.isArray(data.recentTools) && data.recentTools.length) {
        setFeedbackAppId(data.applicationId as string);
        setFeedbackTools(data.recentTools as RecentToolOption[]);
      } else {
        setFeedbackAppId(null);
        setFeedbackTools([]);
      }
      setSubmitting(false);
    } catch (err) {
      console.error('[log-external]', err);
      setError('Network error. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  const canSubmit = company.trim().length > 0 && role.trim().length > 0 && !submitting;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-muted'} btn-small`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
      >
        <ExternalLink size={16} aria-hidden />
        I applied somewhere else &mdash; log it
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Click backdrop closes
          if (e.target === dialogRef.current) close();
        }}
        style={{
          padding: 0,
          border: 'none',
          borderRadius: '0.875rem',
          maxWidth: '520px',
          width: '92vw',
          background: 'var(--color-surface, white)',
          color: 'var(--color-on-surface)',
          boxShadow: '0 24px 64px rgba(17, 24, 39, 0.2)'}}
      >
        <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
          {savedAt ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <CheckCircle2 size={32} style={{ color: 'var(--color-green, #4a9b4f)', margin: '0 auto 0.75rem', display: 'block' }} aria-hidden />
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Application logged</h2>
              <p style={{ margin: '0 0 1.25rem', color: 'var(--color-on-surface-variant)' }}>
                We noted your application for <strong>{role}</strong> at <strong>{company}</strong> on
                {' '}{savedAt.toLocaleDateString()}. Your counselor was notified and can offer interview
                prep or follow-up support.
              </p>
              {feedbackAppId && feedbackTools.length > 0 ? (
                <ApplicationAiFeedbackPrompt
                  jobApplicationId={feedbackAppId}
                  recentTools={feedbackTools}
                  onDone={() => {
                    setFeedbackAppId(null);
                    setFeedbackTools([]);
                  }}
                  onSkip={() => {
                    setFeedbackAppId(null);
                    setFeedbackTools([]);
                  }}
                />
              ) : null}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-muted btn-small" onClick={close}>
                  Done
                </button>
                <button type="button" className="btn btn-primary btn-small" onClick={reset}>
                  Log another
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <header style={{ marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Log an external application</h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                  Just applied on Indeed, LinkedIn, or a company site? Drop the basics and we&rsquo;ll
                  add it to your tracker + give your counselor a heads-up.
                </p>
              </header>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="log-ext-company">
                  Company <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  id="log-ext-company"
                  ref={firstFieldRef}
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label htmlFor="log-ext-role">
                  Role <span style={{ color: 'var(--color-accent)' }}>*</span>
                </label>
                <input
                  id="log-ext-role"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="IT Support Specialist"
                  required
                  disabled={submitting}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="log-ext-source">Where</label>
                  <select
                    id="log-ext-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value as Source)}
                    disabled={submitting}
                  >
                    {SOURCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="log-ext-url">Job URL (optional)</label>
                  <input
                    id="log-ext-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="log-ext-notes">Notes (optional)</label>
                <textarea
                  id="log-ext-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Recruiter contact, salary range, anything you want your counselor to know."
                  disabled={submitting}
                />
              </div>

              {error ? (
                <div role="alert" style={{ background: 'rgba(173,44,77,0.08)', borderLeft: '4px solid var(--color-accent)', padding: '0.65rem 0.85rem', borderRadius: '0 6px 6px 0', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                  {error}
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-muted btn-small" onClick={close} disabled={submitting}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-small"
                  disabled={!canSubmit}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {submitting ? <PortalInlineSpinner size={16} /> : null}
                  {submitting ? 'Logging…' : 'Log application'}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
