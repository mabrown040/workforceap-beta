'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './MobileApplyFunnel.module.css';

type Step = 'overview' | 'apply' | 'success' | 'tracked';

interface MobileApplyFunnelProps {
  jobId: string;
  authenticated?: boolean;
  jobTitle?: string;
  employerName?: string;
  salaryLine?: string | null;
  location?: string;
  jobType?: string;
  description?: string | null;
  requirements?: string[];
}

export default function MobileApplyFunnel({
  jobId,
  authenticated = true,
  jobTitle,
  employerName,
  salaryLine,
  location,
  jobType,
  description,
  requirements,
}: MobileApplyFunnelProps) {
  const [step, setStep] = useState<Step>('overview');
  const [applying, setApplying] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [profileShareConsent, setProfileShareConsent] = useState(false);
  const [resumeShareConsent, setResumeShareConsent] = useState(false);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // Ensure submit button is visible when keyboard opens (Virtual Viewport API)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = (window as any).visualViewport;
    if (!vv) return;

    const handleVisualViewport = () => {
      if (!submitBtnRef.current) return;
      const btn = submitBtnRef.current;
      const btnRect = btn.getBoundingClientRect();
      const visibleBottom = vv.height + vv.offsetTop;
      if (btnRect.bottom > visibleBottom) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };

    vv.addEventListener('resize', handleVisualViewport);
    vv.addEventListener('scroll', handleVisualViewport);
    return () => {
      vv.removeEventListener('resize', handleVisualViewport);
      vv.removeEventListener('scroll', handleVisualViewport);
    };
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  async function handleApply() {
    clearErrors();
    if (!profileShareConsent) {
      const msg = 'Please check the box to share your profile with the employer.';
      setFieldErrors({ consent: msg });
      setError(msg);
      return;
    }

    setApplying(true);
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
        setStep('success');
      } else {
        const msg = res.status === 401
          ? 'Please log in to apply.'
          : data.error ?? "We couldn't submit your application. Try again in a moment.";
        setError(msg);
        if (res.status === 401) {
          setFieldErrors({ general: msg });
        }
      }
    } catch {
      setError("We couldn't connect. Check your connection and try again.");
    } finally {
      setApplying(false);
    }
  }

  async function handleAddToTracker() {
    clearErrors();
    setTracking(true);
    try {
      const res = await fetch('/api/member/job-applications/track-curated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('tracked');
      } else {
        setError(data.error ?? "We couldn't save this to your tracker. Try again in a moment.");
      }
    } catch {
      setError("We couldn't connect. Check your connection and try again.");
    } finally {
      setTracking(false);
    }
  }

  function goBack() {
    if (step === 'apply') {
      setStep('overview');
      clearErrors();
    } else if (step === 'success' || step === 'tracked') {
      setStep('apply');
      clearErrors();
    }
  }

  function startApply() {
    setStep('apply');
    clearErrors();
  }

  // Progress indicator
  const progressActive = step === 'overview' ? 1 : step === 'apply' ? 2 : 3;
  const progressText = step === 'apply' ? 'Step 2 of 3' : step === 'success' ? 'Step 3 of 3' : '';

  // === DESKTOP FALLBACK (inline apply form) ===
  const desktopApply = (
    <div className={styles['desktop-apply-container']}>
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
            onChange={(e) => { setProfileShareConsent(e.target.checked); clearErrors(); }}
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

        {fieldErrors.consent && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginTop: '0.5rem' }}>⚠️ {fieldErrors.consent}</p>
        )}

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
        style={{ width: '100%', minHeight: '52px' }}
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
    </div>
  );

  // === MOBILE STICKY CTA BAR ===
  const mobileStickyCTA = authenticated && step === 'overview' && (
    <div className={styles['mobile-only']}>
      <div className={styles['mobile-sticky-cta']}>
        <div className={styles['mobile-sticky-cta-info']}>
          <span className={styles['mobile-sticky-cta-title']}>{jobTitle}</span>
          <span className={styles['mobile-sticky-cta-meta']}>{employerName}</span>
        </div>
        <button
          type="button"
          className={styles['mobile-sticky-cta-btn']}
          onClick={startApply}
          aria-label={`Apply to ${jobTitle}`}
        >
          Apply Now
        </button>
      </div>
      <div className={styles['mobile-sticky-cta-spacer']} />
    </div>
  );

  // === MOBILE OVERLAY (apply / success / tracked) ===
  const mobileOverlay = step !== 'overview' && (
    <div className={styles['mobile-only']}>
      <div className={styles['mobile-funnel-overlay']}>
        {/* Header */}
        <div className={styles['mobile-funnel-header']}>
          <button
            type="button"
            className={styles['mobile-funnel-back-btn']}
            onClick={goBack}
            aria-label="Go back"
          >
            ←
          </button>
          <p className={styles['mobile-funnel-title']}>
            {step === 'apply' ? 'Review & Submit' : step === 'success' ? 'Application Sent' : 'Saved to Tracker'}
          </p>
          <span className={styles['mobile-funnel-progress']}>{progressText}</span>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '0.75rem 1.25rem 0' }}>
          <div className={styles['mobile-funnel-progress-bar']}>
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={styles['mobile-funnel-progress-segment'] + (n <= progressActive ? ' ' + styles['active'] : '')}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className={styles['mobile-funnel-body']}>
          {error && (
            <div className="admin-error-banner" style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)' }} role="alert">
              {error}
            </div>
          )}

          {step === 'apply' && (
            <>
              <div className={styles['overview-card']} style={{ marginBottom: '1rem' }}>
                <h3 className={styles['overview-title']}>{jobTitle}</h3>
                <p className={styles['overview-meta']}>{employerName} · {location} · {jobType}</p>
                {salaryLine && <p className={styles['overview-salary']}>{salaryLine}</p>}
              </div>

              <div className={styles['consent-card']}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', marginTop: 0 }}>Application Consent</h4>

                <label className={styles['consent-label']}>
                  <input
                    type="checkbox"
                    checked={profileShareConsent}
                    onChange={(e) => { setProfileShareConsent(e.target.checked); clearErrors(); }}
                    className={styles['consent-checkbox']}
                    aria-invalid={!!fieldErrors.consent}
                  />
                  <span>
                    I consent to share my profile information (name, contact, program, skills) with this employer.
                    <span style={{ color: 'var(--color-accent)' }}> *</span>
                  </span>
                </label>
                {fieldErrors.consent && (
                  <p className={styles['consent-error']}>⚠️ {fieldErrors.consent}</p>
                )}

                <label className={styles['consent-label']}>
                  <input
                    type="checkbox"
                    checked={resumeShareConsent}
                    onChange={(e) => setResumeShareConsent(e.target.checked)}
                    className={styles['consent-checkbox']}
                  />
                  <span>Also share my resume with this employer (if available)</span>
                </label>

                <p className={styles['consent-hint']}>
                  Your information will only be shared with this employer for this specific job application.
                  You can manage your applications in your{' '}
                  <Link href="/dashboard/job-applications" style={{ color: 'var(--color-accent)' }}>dashboard</Link>.
                </p>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className={styles['success-card']}>
              <p className={styles['success-title']}>Application submitted successfully!</p>
              <p className={styles['success-body']}>The employer will review your application and contact you.</p>
              <p className={styles['success-body']}>
                <Link href="/dashboard/job-applications" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                  Open Application Tracker
                </Link>
                {' '}to see this role on your board.
              </p>
            </div>
          )}

          {step === 'tracked' && (
            <div className={styles['tracked-card']}>
              <p style={{ fontWeight: 700, margin: 0 }}>Saved to your Application Tracker</p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: 'var(--color-on-surface-variant)' }}>
                We added this job under <strong>Saved</strong>. Update the stage as you apply and interview.
              </p>
              <Link href="/dashboard/job-applications" className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']} style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                Go to Application Tracker
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles['mobile-funnel-footer']}>
          {step === 'apply' && (
            <>
              <button
                ref={submitBtnRef}
                type="button"
                className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']}
                onClick={handleApply}
                disabled={applying || !profileShareConsent}
                style={{ scrollMarginBottom: '120px' }}
              >
                {applying ? 'Submitting application…' : 'Submit Application'}
              </button>
              {!profileShareConsent && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', textAlign: 'center' }}>
                  Please consent to share your profile to apply
                </p>
              )}
            </>
          )}
          {step === 'success' && (
            <Link href="/dashboard/job-applications" className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']}>
              Open Application Tracker
            </Link>
          )}
          {step === 'tracked' && (
            <Link href="/dashboard/job-applications" className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']}>
              Go to Application Tracker
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  // Guest mobile state
  if (!authenticated) {
    return (
      <>
        <div className={styles['mobile-only']}>
          <div className={styles['guest-card']}>
            <Link href={`/login?redirectTo=${encodeURIComponent(`/dashboard/jobs/${jobId}`)}`} className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']}>
              Log in to apply
            </Link>
            <p className={styles['guest-text']}>You need a WorkforceAP member account to submit an application to this role.</p>
            <p className={styles['guest-text']}>New here?{' '}
              <Link href="/apply" className={styles['guest-link']}>Start your application</Link>
            </p>
          </div>
        </div>
        <div className={styles['desktop-apply-container']}>
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
        </div>
      </>
    );
  }

  return (
    <>
      {mobileStickyCTA}
      {mobileOverlay}
      {desktopApply}
    </>
  );
}
