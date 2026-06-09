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
  description?: string;
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
  const errorRef = useRef<HTMLDivElement>(null);
  const consentRef = useRef<HTMLDivElement>(null);

  // Scroll error into view when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Scroll consent into view when field error appears
  useEffect(() => {
    if (fieldErrors.consent && consentRef.current) {
      consentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [fieldErrors.consent]);

  // Ensure submit button is visible when keyboard opens
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisualViewport = () => {
      const vv = (window as any).visualViewport;
      if (!vv || !submitBtnRef.current) return;
      const btn = submitBtnRef.current;
      const btnRect = btn.getBoundingClientRect();
      const visibleBottom = vv.height + vv.offsetTop;
      if (btnRect.bottom > visibleBottom) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    };

    const vv = (window as any).visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleVisualViewport);
      vv.addEventListener('scroll', handleVisualViewport);
      return () => {
        vv.removeEventListener('resize', handleVisualViewport);
        vv.removeEventListener('scroll', handleVisualViewport);
      };
    }
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors({});
  }, []);

  async function handleApply() {
    clearErrors();
    if (!profileShareConsent) {
      const msg = 'To apply, please agree to share your profile with the employer. This helps them learn more about you.';
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const msg = res.status === 401
          ? 'Please log in to apply. Your session may have expired.'
          : res.status === 409
          ? "Looks like you've already applied to this job. Great initiative!"
          : data.error ?? "We hit a small hiccup sending your application. Please try again in a moment.";
        setError(msg);
        if (res.status === 401 || res.status === 409) {
          setFieldErrors({ general: msg });
        }
      }
    } catch {
      setError("We couldn't connect right now. Check your connection and give it another try.");
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
        setStep('success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    } else if (step === 'success') {
      setStep('apply');
      clearErrors();
    }
  }

  function startApply() {
    setStep('apply');
    clearErrors();
  }

  // Progress indicator text
  const progressText = step === 'apply' ? 'Step 2 of 3' : step === 'success' ? 'Step 3 of 3' : 'Step 1 of 3';
  const progressActive = step === 'overview' ? 1 : step === 'apply' ? 2 : 3;

  // === DESKTOP FALLBACK (inline apply form) ===
  const desktopApply = (
    <div className={styles['desktop-apply-container']}>
      {error && (
        <div ref={errorRef} className="admin-error-banner" style={{ padding: '0.75rem', marginBottom: '1rem', borderRadius: 'var(--radius-sm)' }} role="alert">
          {error}
          {error === 'Please log in to apply. Your session may have expired.' && (
            <Link href={`/login?redirectTo=${encodeURIComponent(`/dashboard/jobs/${jobId}`)}`} style={{ marginLeft: '0.5rem', textDecoration: 'underline' }}>
              Log in
            </Link>
          )}
        </div>
      )}

      <div ref={consentRef} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--surface-container-lowest)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}>
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

  // === MOBILE FUNNEL ===
  if (!authenticated) {
    return (
      <>
        <div className={styles['mobile-only']}>
          <div className={styles['guest-card']}>
            <Link href={`/login?redirectTo=${encodeURIComponent(`/dashboard/jobs/${jobId}`)}`} className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']}>
              Log in to apply
            </Link>
            <p className={styles['guest-text']}>You need a WorkforceAP member account to submit an application to this role.</p>
            <p className={styles['guest-text']}>New here?{' '}<Link href="/apply" className={styles['guest-link']}>Start your application</Link></p>
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

  // Mobile overview CTA (inline on the page, before the overlay)
  const mobileOverviewCTA = (
    <div className={styles['mobile-only']}>
      <div className={styles['overview-card']}>
        <h3 className={styles['overview-title']}>{jobTitle}</h3>
        <p className={styles['overview-meta']}>{employerName} · {location} · {jobType}</p>
        {salaryLine && <p className={styles['overview-salary']}>{salaryLine}</p>}
        <div className={styles['overview-actions']}>
          <button
            type="button"
            className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-primary']}
            onClick={startApply}
          >
            Apply Now
          </button>
          <button
            type="button"
            className={styles['mobile-funnel-btn'] + ' ' + styles['mobile-funnel-btn-ghost']}
            onClick={handleAddToTracker}
            disabled={tracking}
          >
            {tracking ? 'Adding…' : 'Save to tracker only'}
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile overlay for apply / success
  const mobileOverlay = step !== 'overview' && (
    <div className={styles['mobile-only']}>
      <div className={styles['mobile-funnel-overlay']} role="dialog" aria-modal="true" aria-labelledby="funnel-title">
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
          <p id="funnel-title" className={styles['mobile-funnel-title']}>
            {step === 'apply' ? 'Review & Submit' : 'Application Sent'}
          </p>
          <span className={styles['mobile-funnel-progress']}>{progressText}</span>
        </div>

        {/* Progress bar */}
        <div className={styles['mobile-funnel-progress-bar-container']}>
          <div className={styles['mobile-funnel-progress-bar']} aria-hidden="true">
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
            <div ref={errorRef} className={styles['inline-error']} role="alert" aria-live="polite">
              <span className={styles['inline-error-icon']}>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {step === 'apply' && (
            <>
              <div className={styles['overview-card']} style={{ marginBottom: '1rem' }}>
                <h3 className={styles['overview-title']}>{jobTitle}</h3>
                <p className={styles['overview-meta']}>{employerName} · {location} · {jobType}</p>
                {salaryLine && <p className={styles['overview-salary']}>{salaryLine}</p>}
              </div>

              <div ref={consentRef} className={styles['consent-card']}>
                <h4 className={styles['consent-heading']}>Application Consent</h4>

                <label className={styles['consent-label']}>
                  <input
                    type="checkbox"
                    checked={profileShareConsent}
                    onChange={(e) => { setProfileShareConsent(e.target.checked); clearErrors(); }}
                    className={styles['consent-checkbox']}
                    aria-invalid={!!fieldErrors.consent}
                    aria-describedby={fieldErrors.consent ? 'consent-error' : undefined}
                  />
                  <span>
                    I consent to share my profile information (name, contact, program, skills) with this employer.
                    <span style={{ color: 'var(--color-accent)' }}> *</span>
                  </span>
                </label>
                {fieldErrors.consent && (
                  <p id="consent-error" className={styles['consent-error']}>{fieldErrors.consent}</p>
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
              >
                {applying ? 'Submitting application…' : 'Submit Application'}
              </button>
              {!profileShareConsent && (
                <p className={styles['footer-hint']}>
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
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileOverviewCTA}
      {mobileOverlay}
      {desktopApply}
    </>
  );
}
