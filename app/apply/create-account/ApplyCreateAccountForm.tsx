'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { trackApplyFunnel } from '@/lib/analytics/events';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';

const PROGRAM_STORAGE_KEY = 'apply_program_slug';

export default function ApplyCreateAccountForm() {
  const searchParams = useSearchParams();
  const [init, setInit] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [programSlug, setProgramSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const completedRef = useRef(false);
  const dropoffRef = useRef({ startedFields: 0, smsOptIn: false, programSlug: null as string | null });

  useEffect(() => {
    trackApplyFunnel(3, 'account_create_view');
  }, []);

  useEffect(() => {
    const qEmail = searchParams.get('email')?.trim();
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const slug = sessionStorage.getItem(PROGRAM_STORAGE_KEY);
    if (!slug) {
      trackApplyFunnel(3, 'account_missing_program');
      setInit('missing');
      return;
    }
    setProgramSlug(slug);
    setInit('ready');
  }, []);

  useEffect(() => {
    dropoffRef.current = {
      startedFields: [firstName, lastName, email, phone, password, confirmPassword].filter(Boolean).length,
      smsOptIn,
      programSlug,
    };
  }, [confirmPassword, email, firstName, lastName, password, phone, programSlug, smsOptIn]);

  useEffect(() => {
    return () => {
      if (init === 'ready' && !completedRef.current) {
        trackApplyFunnel(3, 'account_create_dropoff', {
          started_fields: dropoffRef.current.startedFields,
          sms_opt_in: dropoffRef.current.smsOptIn,
          program_slug: dropoffRef.current.programSlug,
        });
      }
    };
  }, [init]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('Please enter your first name so we know what to call you.');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter an email address so we can send your next steps.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a phone number in case we need to reach you quickly about your application.');
      return;
    }
    if (password.length < 8) {
      setError('Create a password with at least 8 characters so you can return to your account later.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match yet. Re-enter them and try again.');
      return;
    }
    if (!programSlug) {
      setError('We lost your selected program. Go back to step 2 and choose the program you want to discuss first.');
      return;
    }

    setLoading(true);
    trackApplyFunnel(3, 'account_create_submit', { program_slug: programSlug, sms_opt_in: smsOptIn });

    try {
      let referralRef: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          referralRef = sessionStorage.getItem(APPLY_REFERRAL_SESSION_KEY);
        } catch {
          /* ignore */
        }
      }

      const res = await fetch('/api/apply/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          smsOptIn,
          password,
          programSlug,
          referralRef: referralRef?.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'We could not create your account yet. Please try again.');
        trackApplyFunnel(3, 'account_create_error', { program_slug: programSlug, error_message: data.error ?? 'unknown_error' });
        setLoading(false);
        return;
      }

      sessionStorage.removeItem(PROGRAM_STORAGE_KEY);
      sessionStorage.removeItem('apply_eligibility');
      try {
        sessionStorage.removeItem(APPLY_REFERRAL_SESSION_KEY);
      } catch {
        /* ignore */
      }
      completedRef.current = true;
      trackApplyFunnel(3, 'account_created', { program_slug: programSlug, redirect_to: data.redirectTo ?? '/dashboard' });
      window.location.href = data.redirectTo ?? '/dashboard';
    } catch {
      setError('Something went wrong while creating your account. Please try again, or call (512) 777-1808 if you need help finishing.');
      trackApplyFunnel(3, 'account_create_error', { program_slug: programSlug, error_message: 'network_or_unknown' });
      setLoading(false);
    }
  };

  if (init === 'loading') {
    return <p>Loading…</p>;
  }

  if (init === 'missing') {
    return (
      <div className="apply-form-missing-session">
        <p role="alert" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          We couldn&apos;t find your saved program choice. This usually happens if you skipped step 2, opened this page in a new tab or device,
          or your browser cleared site data.
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          <Link href="/apply/results" className="btn btn-primary">
            Back to step 2 — choose a program
          </Link>
        </p>
        <p>
          <Link href="/apply">Start again from step 1</Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="apply-form">
      <div className="apply-progress-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="apply-progress-fill" style={{ width: '100%' }} />
        <p className="apply-progress-label">Step 3 of 3 — create your account</p>
      </div>

      <p className="apply-step-back-nav" style={{ marginBottom: '1rem' }}>
        <Link href="/apply/results">← Back to step 2 — program selection</Link>
      </p>

      <div className="apply-transition-card" role="note" aria-label="Why account creation matters">
        <strong>Why we ask for this now:</strong>
        <span> your account saves the program you selected, lets you log back in, and gives our team the information needed to follow up. It is not a final enrollment decision by itself.</span>
      </div>

      <p className="apply-step-desc" style={{ marginTop: '1rem' }}>
        You&apos;ll get next steps after account creation. In many cases, that means you can go straight to your dashboard. Some applicants may be asked to verify their email first.
      </p>

      <div className="form-group">
        <label htmlFor="firstName">First Name *</label>
        <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="given-name" />
      </div>
      <div className="form-group">
        <label htmlFor="lastName">Last Name *</label>
        <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="family-name" />
      </div>
      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="form-group">
        <label htmlFor="phone">Phone *</label>
        <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          Text me updates about my application (optional)
        </label>
      </div>
      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        <p className="apply-field-hint">Use at least 8 characters. You&apos;ll use this password to come back and check your status.</p>
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password *</label>
        <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-submit-full" disabled={loading}>
        {loading ? 'Creating your account…' : 'Create account and see next steps'}
      </button>
    </form>
  );
}
