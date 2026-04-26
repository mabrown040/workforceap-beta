'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function JobApplyButton({ jobId, authenticated = true }: { jobId: string; authenticated?: boolean }) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [tracked, setTracked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileShareConsent, setProfileShareConsent] = useState(false);
  const [resumeShareConsent, setResumeShareConsent] = useState(false);

  async function handleApply() {
    if (!profileShareConsent) {
      setError('You must consent to share your profile with the employer.');
      return;
    }

    setApplying(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareProfile: true,
          shareResume: resumeShareConsent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setApplied(true);
      } else {
        if (res.status === 401) {
          setError('Please log in to apply.');
        } else {
          setError(data.error ?? "We couldn't submit your application. Try again in a moment.");
        }
      }
    } catch {
      setError("We couldn't connect. Check your connection and try again.");
    } finally {
      setApplying(false);
    }
  }

  async function handleAddToTracker() {
    setTracking(true);
    setError(null);
    try {
      const res = await fetch('/api/member/job-applications/track-curated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok) {
        setTracked(true);
      } else {
        setError(data.error ?? "We couldn't save this to your tracker. Try again in a moment.");
      }
    } catch {
      setError("We couldn't connect. Check your connection and try again.");
    } finally {
      setTracking(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="job-apply-guest">
        <Link href={`/login?redirectTo=${encodeURIComponent(`/dashboard/jobs/${jobId}`)}`} className="btn btn-primary btn-large">
          Log in to apply
        </Link>
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          You need a WorkforceAP member account to submit an application to this role.
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          New here?{' '}
          <Link href="/apply" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Start your application
          </Link>
        </p>
      </div>
    );
  }

  if (applied) {
    return (
      <div
        style={{
          padding: '1.5rem',
          background: 'rgba(74, 155, 79, 0.1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(74, 155, 79, 0.3)',
 textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--color-accent)', margin: 0 }}>
          Application submitted successfully!
        </p>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-on-surface-variant)' }}>
          The employer will review your application and contact you.
        </p>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
          <Link href="/dashboard/job-applications" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Open Application Tracker
          </Link>
          {' '}to see this role on your board.
        </p>
      </div>
    );
  }

  if (tracked) {
    return (
      <div
        style={{
          padding: '1.25rem',
          background: 'var(--surface-container)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--outline-variant)',
        }}
      >
        <p style={{ fontWeight: 600, margin: 0 }}>Saved to your Application Tracker</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
          We added this job under <strong>Saved</strong>. Update the stage as you apply and interview.
        </p>
        <Link
          href="/dashboard/job-applications"
          className="btn btn-primary"
          style={{ marginTop: '0.75rem', display: 'inline-block' }}
        >
          Go to Application Tracker
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="admin-error-banner" style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)' }} role="alert">
          {error}
          {error === 'Please log in to apply.' && (
            <Link href={`/login?redirectTo=${encodeURIComponent(`/dashboard/jobs/${jobId}`)}`} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>
              Log in
            </Link>
          )}
        </div>
      )}
      
      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Application Consent</h4>
        
        <label style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem' }}>
          <input
            type="checkbox"
            checked={profileShareConsent}
            onChange={(e) => setProfileShareConsent(e.target.checked)}
            style={{ marginTop: '0.15rem', flexShrink: 0 }}
          />
          <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            I consent to share my profile information (name, contact, program, skills) with this employer. 
            <span style={{ color: 'var(--color-accent)' }}> *</span>
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={resumeShareConsent}
            onChange={(e) => setResumeShareConsent(e.target.checked)}
            style={{ marginTop: '0.15rem', flexShrink: 0 }}
          />
          <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
            Also share my resume with this employer (if available)
          </span>
        </label>
        
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.75rem', lineHeight: 1.4 }}>
          Your information will only be shared with this employer for this specific job application. 
          You can manage your applications in your <Link href="/dashboard/job-applications" style={{ color: 'var(--color-accent)' }}>dashboard</Link>.
        </p>
      </div>

      <button
        type="button"
        className="btn btn-accent btn-large"
        onClick={handleApply}
        disabled={applying || !profileShareConsent}
        style={{ width: '100%' }}
      >
        {applying ? 'Submitting application…' : 'Submit Application'}
      </button>

      <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
        Not ready to apply?{' '}
        <button
          type="button"
          onClick={handleAddToTracker}
          disabled={tracking}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--color-accent)',
            fontWeight: 600,
            cursor: tracking ? 'wait' : 'pointer',
            textDecoration: 'underline',
          }}
        >
          {tracking ? 'Adding…' : 'Add to my tracker only'}
        </button>
      </p>

      {!profileShareConsent && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
          Please consent to share your profile to apply
        </p>
      )}
    </div>
  );
}
