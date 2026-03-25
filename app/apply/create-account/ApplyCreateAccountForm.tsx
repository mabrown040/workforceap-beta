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
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    zip?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
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
      startedFields: [firstName, lastName, email, phone, addressLine1, city, stateVal, zip, password, confirmPassword].filter(Boolean)
        .length,
      smsOptIn,
      programSlug,
    };
  }, [addressLine1, city, confirmPassword, email, firstName, lastName, password, phone, programSlug, smsOptIn, stateVal, zip]);

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

  const emailLooksValid = (value: string) => {
    const v = value.trim();
    if (!v.includes('@')) return false;
    const [local, domain] = v.split('@');
    if (!local || !domain || !domain.includes('.')) return false;
    const tld = domain.split('.').pop() ?? '';
    return tld.length >= 2;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const nextFieldErrors: typeof fieldErrors = {};
    if (!firstName.trim()) {
      nextFieldErrors.firstName = 'Enter your first name.';
    }
    if (!lastName.trim()) {
      nextFieldErrors.lastName = 'Enter your last name.';
    }
    if (!email.trim()) {
      nextFieldErrors.email = 'Enter an email address.';
    } else if (!emailLooksValid(email)) {
      nextFieldErrors.email = 'Use a valid email address (include @ and a domain like .com).';
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phone.trim()) {
      nextFieldErrors.phone = 'Enter a phone number.';
    } else if (phoneDigits.length < 10) {
      nextFieldErrors.phone = 'Use a phone number with at least 10 digits.';
    }
    if (!addressLine1.trim()) {
      nextFieldErrors.addressLine1 = 'Enter your street address.';
    }
    if (!city.trim()) {
      nextFieldErrors.city = 'Enter your city.';
    }
    if (!stateVal.trim()) {
      nextFieldErrors.state = 'Enter your state.';
    }
    if (!zip.trim()) {
      nextFieldErrors.zip = 'Enter your ZIP code.';
    }
    if (password.length < 8) {
      nextFieldErrors.password = 'Use at least 8 characters.';
    }
    if (password.length >= 8 && confirmPassword !== password) {
      nextFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const needsContact =
        nextFieldErrors.phone ||
        nextFieldErrors.addressLine1 ||
        nextFieldErrors.city ||
        nextFieldErrors.state ||
        nextFieldErrors.zip;
      setError(
        needsContact
          ? 'Phone and address are required for membership.'
          : 'Please fix the highlighted fields and try again.'
      );
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
          phone: phoneDigits,
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim(),
          state: stateVal.trim(),
          zip: zip.trim(),
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
    <form onSubmit={handleSubmit} className="apply-form" noValidate>
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
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            if (fieldErrors.firstName) setFieldErrors((f) => ({ ...f, firstName: undefined }));
          }}
          autoComplete="given-name"
          aria-invalid={!!fieldErrors.firstName}
        />
        {fieldErrors.firstName ? <p className="form-error">{fieldErrors.firstName}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="lastName">Last Name *</label>
        <input
          id="lastName"
          type="text"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            if (fieldErrors.lastName) setFieldErrors((f) => ({ ...f, lastName: undefined }));
          }}
          autoComplete="family-name"
          aria-invalid={!!fieldErrors.lastName}
        />
        {fieldErrors.lastName ? <p className="form-error">{fieldErrors.lastName}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((f) => ({ ...f, email: undefined }));
          }}
          autoComplete="email"
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email ? <p className="form-error">{fieldErrors.email}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="phone">Phone *</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            if (fieldErrors.phone) setFieldErrors((f) => ({ ...f, phone: undefined }));
          }}
          autoComplete="tel"
          required
          aria-invalid={!!fieldErrors.phone}
        />
        {fieldErrors.phone ? <p className="form-error">{fieldErrors.phone}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="addressLine1">Street address *</label>
        <input
          id="addressLine1"
          type="text"
          value={addressLine1}
          onChange={(e) => {
            setAddressLine1(e.target.value);
            if (fieldErrors.addressLine1) setFieldErrors((f) => ({ ...f, addressLine1: undefined }));
          }}
          autoComplete="address-line1"
          required
          aria-invalid={!!fieldErrors.addressLine1}
        />
        {fieldErrors.addressLine1 ? <p className="form-error">{fieldErrors.addressLine1}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="addressLine2">Apt / suite (optional)</label>
        <input
          id="addressLine2"
          type="text"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          autoComplete="address-line2"
        />
      </div>
      <div className="form-group">
        <label htmlFor="city">City *</label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => {
            setCity(e.target.value);
            if (fieldErrors.city) setFieldErrors((f) => ({ ...f, city: undefined }));
          }}
          autoComplete="address-level2"
          required
          aria-invalid={!!fieldErrors.city}
        />
        {fieldErrors.city ? <p className="form-error">{fieldErrors.city}</p> : null}
      </div>
      <div
        className="form-group apply-create-account-state-zip"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0.75rem' }}
      >
        <div>
          <label htmlFor="state">State *</label>
          <input
            id="state"
            type="text"
            value={stateVal}
            onChange={(e) => {
              setStateVal(e.target.value);
              if (fieldErrors.state) setFieldErrors((f) => ({ ...f, state: undefined }));
            }}
            autoComplete="address-level1"
            required
            aria-invalid={!!fieldErrors.state}
          />
          {fieldErrors.state ? <p className="form-error">{fieldErrors.state}</p> : null}
        </div>
        <div>
          <label htmlFor="zip">ZIP *</label>
          <input
            id="zip"
            type="text"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value);
              if (fieldErrors.zip) setFieldErrors((f) => ({ ...f, zip: undefined }));
            }}
            autoComplete="postal-code"
            required
            aria-invalid={!!fieldErrors.zip}
          />
          {fieldErrors.zip ? <p className="form-error">{fieldErrors.zip}</p> : null}
        </div>
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          Text me updates about my application (optional)
        </label>
      </div>
      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
          }}
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.password}
        />
        <p className="apply-field-hint">Use at least 8 characters. You&apos;ll use this password to come back and check your status.</p>
        {fieldErrors.password ? <p className="form-error">{fieldErrors.password}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password *</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
          }}
          autoComplete="new-password"
          aria-invalid={!!fieldErrors.confirmPassword}
        />
        {fieldErrors.confirmPassword ? <p className="form-error">{fieldErrors.confirmPassword}</p> : null}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-submit-full" disabled={loading}>
        {loading ? 'Creating your account…' : 'Create account and see next steps'}
      </button>
    </form>
  );
}
