'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { trackApplyFunnel } from '@/lib/analytics/events';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';
import {
  APPLY_PROGRAM_RANKED_KEY,
  APPLY_PROGRAM_SLUG_KEY,
  getCareerQuizPayloadFromStorage,
} from '@/lib/apply/applyProgramStorage';
import { getProgramBySlug, getProgramDisplayTitle } from '@/lib/content/programs';

const US_STATES: { abbr: string; name: string }[] = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' }, { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' }, { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' }, { abbr: 'DC', name: 'District of Columbia' },
  { abbr: 'FL', name: 'Florida' }, { abbr: 'GA', name: 'Georgia' }, { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' }, { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' }, { abbr: 'KS', name: 'Kansas' }, { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' }, { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' }, { abbr: 'MI', name: 'Michigan' }, { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' }, { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' }, { abbr: 'NV', name: 'Nevada' }, { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' }, { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' }, { abbr: 'ND', name: 'North Dakota' }, { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' }, { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' }, { abbr: 'SC', name: 'South Carolina' }, { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' }, { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' }, { abbr: 'VA', name: 'Virginia' }, { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' }, { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' },
];

export default function ApplyCreateAccountForm() {
  const searchParams = useSearchParams();
  const [init, setInit] = useState<'loading' | 'missing' | 'ready'>('loading');
  const [programRankedSlugs, setProgramRankedSlugs] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifyEmailMode, setVerifyEmailMode] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [optionalAddressOpen, setOptionalAddressOpen] = useState(false);

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const dropoffRef = useRef({ startedFields: 0, smsOptIn: false, program_slugs: null as string[] | null });

  useEffect(() => {
    trackApplyFunnel(3, 'account_create_view');
  }, []);

  useEffect(() => {
    const qEmail = searchParams.get('email')?.trim();
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rankedRaw = sessionStorage.getItem(APPLY_PROGRAM_RANKED_KEY);
      if (rankedRaw) {
        const parsed = JSON.parse(rankedRaw) as unknown;
        if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => typeof x === 'string')) {
          setProgramRankedSlugs(parsed as string[]);
          setInit('ready');
          return;
        }
      }
    } catch {
      /* fall through */
    }
    const slug = sessionStorage.getItem(APPLY_PROGRAM_SLUG_KEY);
    if (!slug) {
      trackApplyFunnel(3, 'account_missing_program');
      setInit('missing');
      return;
    }
    setProgramRankedSlugs([slug]);
    setInit('ready');
  }, []);

  useEffect(() => {
    dropoffRef.current = {
      startedFields: [firstName, lastName, email, phone, addressLine1, city, stateVal, zip, password, confirmPassword].filter(Boolean)
        .length,
      smsOptIn,
      program_slugs: programRankedSlugs,
    };
  }, [addressLine1, city, confirmPassword, email, firstName, lastName, password, phone, programRankedSlugs, smsOptIn, stateVal, zip]);

  useEffect(() => {
    return () => {
      if (init === 'ready' && !completedRef.current) {
        trackApplyFunnel(3, 'account_create_dropoff', {
          started_fields: dropoffRef.current.startedFields,
          sms_opt_in: dropoffRef.current.smsOptIn,
          program_slugs: dropoffRef.current.program_slugs,
        });
      }
    };
  }, [init]);

  const rankedProgramLabels = (programRankedSlugs ?? []).map((slug) => getProgramDisplayTitle(getProgramBySlug(slug) ?? slug));

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
    if (zip.trim() && !/^\d{5}(-\d{4})?$/.test(zip.trim())) {
      nextFieldErrors.zip = 'Please enter a valid 5-digit ZIP code';
    }
    if (password.length < 8) {
      nextFieldErrors.password = 'Use at least 8 characters.';
    }
    if (password.length >= 8 && confirmPassword !== password) {
      nextFieldErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      const needsContact = nextFieldErrors.phone;
      setError(
        needsContact
          ? 'Please add a phone number to continue.'
          : 'Please fix the highlighted fields and try again.'
      );
      return;
    }

    if (!programRankedSlugs?.length) {
      setError('Your program selections weren\'t saved — please go back to step 2 and choose at least one program.');
      return;
    }

    setLoading(true);
    trackApplyFunnel(3, 'account_create_submit', { program_slugs: programRankedSlugs, sms_opt_in: smsOptIn });

    try {
      let referralRef: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          referralRef = sessionStorage.getItem(APPLY_REFERRAL_SESSION_KEY);
        } catch {
          /* ignore */
        }
      }

      const careerPayload = typeof window !== 'undefined' ? getCareerQuizPayloadFromStorage() : null;

      const res = await fetch('/api/apply/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phoneDigits,
          addressLine1: addressLine1.trim() || undefined,
          addressLine2: addressLine2.trim() || undefined,
          city: city.trim() || undefined,
          state: stateVal.trim() || undefined,
          zip: zip.trim() || undefined,
          smsOptIn,
          password,
          programRankedSlugs,
          referralRef: referralRef?.trim() || undefined,
          recommendedOnetCode: careerPayload?.recommendedOnetCode ?? undefined,
          recommendedCareerTitle: careerPayload?.recommendedCareerTitle ?? undefined,
          careerRecommendationJson: careerPayload?.careerRecommendationJson ?? undefined,
          needsComputerSupportFollowUp: careerPayload?.needsComputerSupportFollowUp ?? undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong — please try again.');
        trackApplyFunnel(3, 'account_create_error', { program_slugs: programRankedSlugs, error_message: data.error ?? 'unknown_error' });
        setLoading(false);
        return;
      }

      sessionStorage.removeItem(APPLY_PROGRAM_SLUG_KEY);
      sessionStorage.removeItem(APPLY_PROGRAM_RANKED_KEY);
      sessionStorage.removeItem('apply_eligibility');
      try {
        sessionStorage.removeItem(APPLY_REFERRAL_SESSION_KEY);
      } catch {
        /* ignore */
      }
      completedRef.current = true;
      trackApplyFunnel(3, 'account_created', { program_slugs: programRankedSlugs, redirect_to: data.redirectTo ?? '/dashboard' });

      // If the API returned a verification message (no session yet), show the verify-email screen
      if (data.message) {
        setVerifyEmail(email.trim().toLowerCase());
        setVerifyEmailMode(true);
        setLoading(false);
        return;
      }

      const dest = typeof data.redirectTo === 'string' && data.redirectTo.startsWith('/') ? data.redirectTo : '/dashboard';
      window.location.href = dest;
    } catch {
      setError('Something went wrong while creating your account. Please try again, or call (512) 777-1808 if you need help finishing.');
      trackApplyFunnel(3, 'account_create_error', { program_slugs: programRankedSlugs, error_message: 'network_or_unknown' });
      setLoading(false);
    }
  };

  if (verifyEmailMode) {
    return (
      <div className="apply-form" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 56, color: '#ad2c4d', display: 'block', marginBottom: '1rem' }} aria-hidden="true">mark_email_unread</span>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: '#1c1b1b' }}>Check your email</h2>
        <p style={{ fontSize: '1rem', color: '#584144', lineHeight: 1.6, marginBottom: '0.5rem' }}>
          We sent a verification link to:
        </p>
        <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ad2c4d', marginBottom: '1.25rem', wordBreak: 'break-all' }}>
          {verifyEmail}
        </p>
        <p style={{ fontSize: '0.9rem', color: '#584144', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Click the link in that email to verify your account, then come back and log in to view your dashboard and next steps.
        </p>
        <Link href="/login" className="btn btn-primary" style={{ display: 'inline-block', marginBottom: '1rem' }}>
          Go to login
        </Link>
        <p style={{ fontSize: '0.85rem', color: '#584144', marginTop: '1rem' }}>
          Didn&rsquo;t get it? Check your spam folder, then call{' '}
          <a href="tel:+15127771808" style={{ color: '#ad2c4d', fontWeight: 600 }}>
            (512) 777-1808
          </a>{' '}
          if you need help finishing your account.
        </p>
      </div>
    );
  }

  if (init === 'loading') {
    return <p>Loading…</p>;
  }

  if (init === 'missing') {
    return (
      <div className="apply-form-missing-session">
        <p role="alert" style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
          We couldn&rsquo;t find your saved program choices. This usually happens if you skipped step 2, opened this page in a new tab or device,
          or your browser cleared site data.
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          <Link href="/apply/results" className="btn btn-primary">
            Back to step 2 — choose your programs
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
      </div>

      <p className="apply-step-back-nav" style={{ marginBottom: '1rem' }}>
        <Link href="/apply/results">← Back to step 2 — program selection</Link>
      </p>

      <div className="apply-transition-card" role="note" aria-label="Why account creation matters">
        <strong>Why we ask for this now:</strong>
        <span> your account saves the program choices you ranked, lets you log back in to check progress, and connects you with training and counselor support. It is not a final enrollment decision by itself.</span>
      </div>

      <div className="apply-transition-card" role="note" aria-label="What you can finish later" style={{ marginTop: '0.75rem' }}>
        <strong>Keep this part light:</strong>
        <span> only your name, email, phone, and password are required to start. Mailing address details can be added later from your profile if we need them.</span>
      </div>

      {rankedProgramLabels.length > 0 ? (
        <div className="apply-transition-card" role="note" aria-label="Saved program choices" style={{ marginTop: '0.75rem' }}>
          <strong>Your saved choices:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
            {rankedProgramLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.35rem 0.6rem',
                  borderRadius: '999px',
                  background: 'rgba(173,44,77,0.08)',
                  color: 'var(--color-on-surface)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: 'var(--color-accent)', fontWeight: 800 }}>#{index + 1}</span>
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="apply-step-desc" style={{ marginTop: '1rem' }}>
        After you create your account, you can view your dashboard and next steps. Some applicants are asked to verify their email first — check your inbox if so.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
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
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.firstName}
          />
          {fieldErrors.firstName ? <p className="form-error">{fieldErrors.firstName}</p> : null}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
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
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.lastName}
          />
          {fieldErrors.lastName ? <p className="form-error">{fieldErrors.lastName}</p> : null}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
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
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.email}
          />
          <p className="apply-field-hint">Use an email you can check today in case we need verification.</p>
          {fieldErrors.email ? <p className="form-error">{fieldErrors.email}</p> : null}
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
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
          <p className="apply-field-hint">We use this for counselor follow-up and application updates.</p>
          {fieldErrors.phone ? <p className="form-error">{fieldErrors.phone}</p> : null}
        </div>
      </div>
      <details
        open={optionalAddressOpen}
        onToggle={(e) => setOptionalAddressOpen((e.currentTarget as HTMLDetailsElement).open)}
        style={{
          marginBottom: '1rem',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '0.875rem',
          padding: '0.9rem 1rem',
          background: 'var(--surface-container-low)',
        }}
      >
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--color-on-surface)' }}>
          Add mailing address now (optional)
        </summary>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0.9rem' }}>
          Skip this if you want to move faster. You can add it later from your profile.
        </p>
        <div className="form-group">
          <label htmlFor="addressLine1">Street address (optional)</label>
          <input
            id="addressLine1"
            type="text"
            value={addressLine1}
            onChange={(e) => {
              setAddressLine1(e.target.value);
              if (fieldErrors.addressLine1) setFieldErrors((f) => ({ ...f, addressLine1: undefined }));
            }}
            autoComplete="address-line1"
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="city">City (optional)</label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (fieldErrors.city) setFieldErrors((f) => ({ ...f, city: undefined }));
              }}
              autoComplete="address-level2"
              aria-invalid={!!fieldErrors.city}
            />
            {fieldErrors.city ? <p className="form-error">{fieldErrors.city}</p> : null}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="state">State (optional)</label>
            <select
              id="state"
              value={stateVal}
              onChange={(e) => {
                setStateVal(e.target.value);
                if (fieldErrors.state) setFieldErrors((f) => ({ ...f, state: undefined }));
              }}
              autoComplete="address-level1"
              aria-invalid={!!fieldErrors.state}
            >
              <option value="">Select…</option>
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>{s.name}</option>
              ))}
            </select>
            {fieldErrors.state ? <p className="form-error">{fieldErrors.state}</p> : null}
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="zip">ZIP (optional)</label>
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => {
                setZip(e.target.value);
                if (fieldErrors.zip) setFieldErrors((f) => ({ ...f, zip: undefined }));
              }}
              autoComplete="postal-code"
              aria-invalid={!!fieldErrors.zip}
            />
            {fieldErrors.zip ? <p className="form-error">{fieldErrors.zip}</p> : null}
          </div>
        </div>
      </details>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={smsOptIn} onChange={(e) => setSmsOptIn(e.target.checked)} />
          Text me updates about my application (optional)
        </label>
        <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Message frequency varies. Reply STOP to cancel, HELP for help. Msg &amp; data rates may apply.</p>
      </div>
      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((f) => ({ ...f, password: undefined }));
            }}
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.password}
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem', lineHeight: 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
        <p className="apply-field-hint">Use at least 8 characters. You&rsquo;ll use this password to come back and check your status.</p>
        {fieldErrors.password ? <p className="form-error">{fieldErrors.password}</p> : null}
      </div>
      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password *</label>
        <div style={{ position: 'relative' }}>
          <input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((f) => ({ ...f, confirmPassword: undefined }));
            }}
            autoComplete="new-password"
            required
            aria-required="true"
            aria-invalid={!!fieldErrors.confirmPassword}
            style={{ paddingRight: '2.5rem' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '0.25rem', lineHeight: 1 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">
              {showConfirmPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>
        {fieldErrors.confirmPassword ? <p className="form-error">{fieldErrors.confirmPassword}</p> : null}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary btn-submit-full" disabled={loading}>
        {loading ? 'Creating your account…' : 'Save my spot and create login'}
      </button>
      <p style={{ marginTop: '0.75rem', marginBottom: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', textAlign: 'center', lineHeight: 1.5 }}>
        No payment is due today. You can come back later to finish your profile.
      </p>
    </form>
  );
}
