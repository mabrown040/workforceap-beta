'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  memberSignupSchema,
  type MemberSignupInput,
  PROGRAM_INTEREST_OPTIONS,
} from '@/lib/validation/member';
import { trackFunnelEvent } from '@/lib/analytics/events';
import { APPLY_REFERRAL_SESSION_KEY } from '@/lib/apply/applyReferralCapture';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';

/* ─── constants (preserved from MemberSignupForm) ─── */
const EMPLOYMENT_OPTIONS = [
  'Employed full-time',
  'Employed part-time',
  'Unemployed',
  'Member',
  'Self-employed',
  'Other',
];
const VETERAN_OPTIONS = ['Yes', 'No', 'Prefer not to say'];

type SignupFormProps = {
  initialRedirectTo?: string;
};

/* ─── styles ─── */
const s = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'var(--font-family)',
  } as React.CSSProperties,

  /* Left branding panel */
  brandPanel: {
    flex: '3 1 60%',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-16) var(--space-8)',
    background: 'linear-gradient(160deg, #1a0a10 0%, var(--color-accent-dark) 60%, var(--color-primary) 100%)',
    overflow: 'hidden',
    color: 'var(--color-white)',
  } as React.CSSProperties,

  brandShapes: {
    position: 'absolute' as const,
    inset: 0,
    pointerEvents: 'none' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  brandContent: {
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
    maxWidth: 480,
  } as React.CSSProperties,

  testimonialCard: {
    position: 'relative' as const,
    zIndex: 1,
    marginTop: 'var(--space-12)',
    padding: 'var(--space-6)',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 'var(--radius-lg)',
    maxWidth: 420,
    textAlign: 'left' as const,
  } as React.CSSProperties,

  /* Right form panel */
  formPanel: {
    flex: '2 1 40%',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-8)',
    background: 'var(--surface-container-lowest)',
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  formContainer: {
    width: '100%',
    maxWidth: 440,
  } as React.CSSProperties,

  heading: {
    fontSize: 'var(--font-size-h2)',
    fontWeight: 800,
    color: 'var(--color-on-surface)',
    marginBottom: 'var(--space-6)',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: 'var(--color-on-surface-variant)',
    marginBottom: 'var(--space-1)',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-base)',
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-on-surface)',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,

  passwordWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  passwordToggle: {
    position: 'absolute',
    right: 'var(--space-3)',
    background: 'none',
    border: 'none',
    color: 'var(--color-on-surface-variant)',
    cursor: 'pointer',
    padding: 'var(--space-1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-base)',
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-on-surface)',
    outline: 'none',
  } as React.CSSProperties,

  fieldGroup: {
    marginBottom: 'var(--space-4)',
  } as React.CSSProperties,

  primaryBtn: {
    width: '100%',
    padding: 'var(--space-4)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: 'var(--color-white)',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,

  errorBanner: {
    background: 'rgba(173,44,77,0.1)',
    borderLeft: '4px solid var(--color-accent)',
    padding: 'var(--space-3) var(--space-4)',
    marginBottom: 'var(--space-4)',
    borderRadius: '0 var(--radius-md) var(--radius-md) 0',
    color: 'var(--color-on-surface)',
    fontSize: 'var(--font-size-sm)',
  } as React.CSSProperties,

  fieldError: {
    fontSize: '0.8rem',
    color: 'var(--color-accent)',
    marginTop: 'var(--space-1)',
  } as React.CSSProperties,

  hint: {
    fontSize: '0.8rem',
    color: 'var(--color-on-surface-variant)',
    marginTop: 'var(--space-1)',
  } as React.CSSProperties,

  strengthRow: {
    display: 'flex',
    gap: 4,
    marginTop: 'var(--space-2)',
  } as React.CSSProperties,
} as const;

/* ─── password strength helper ─── */
function getPasswordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-5
}

function strengthColor(score: number, index: number): string {
  if (index >= score) return 'var(--outline-variant)';
  if (score <= 2) return 'var(--color-accent)';
  if (score <= 3) return 'var(--color-gold)';
  return 'var(--color-green)';
}

export default function SignupForm({ initialRedirectTo = '/dashboard' }: SignupFormProps) {
  /* ─── all business logic preserved from MemberSignupForm ─── */
  const redirectTo = sanitizeRedirectPath(initialRedirectTo, '/dashboard');
  const loginHref = `/login?redirectTo=${encodeURIComponent(redirectTo)}`;
  const isMemberSignup = redirectTo === '/dashboard';

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordVal, setPasswordVal] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberSignupInput>({
    resolver: zodResolver(memberSignupSchema),
    defaultValues: {
      consentCommunications: false,
    },
  });

  const onSubmit = async (data: MemberSignupInput) => {
    setSubmitStatus('loading');
    setErrorMessage(null);
    trackFunnelEvent('member_signup', 'signup_started', {
      program_interest: data.programInterest,
      employment_status: data.employmentStatus,
    });

    try {
      let referralRef: string | undefined;
      try {
        referralRef = sessionStorage.getItem(APPLY_REFERRAL_SESSION_KEY)?.trim() || undefined;
      } catch {
        /* ignore */
      }

      const res = await fetch('/api/member/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, referralRef }),
      });

      const json = await res.json();

      if (!res.ok) {
        trackFunnelEvent('member_signup', 'signup_failed', { program_interest: data.programInterest });
        setSubmitStatus('error');
        setErrorMessage(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      trackFunnelEvent('member_signup', 'signup_completed', { program_interest: data.programInterest });
      try {
        sessionStorage.removeItem(APPLY_REFERRAL_SESSION_KEY);
      } catch {
        /* ignore */
      }
      setSubmitStatus('success');
    } catch {
      trackFunnelEvent('member_signup', 'signup_network_error', { program_interest: data.programInterest });
      setSubmitStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  /* ─── success state ─── */
  if (submitStatus === 'success') {
    return (
      <div style={{ ...s.wrapper, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 440, padding: 'var(--space-8)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--color-green)', marginBottom: 'var(--space-4)', display: 'block' }} aria-hidden="true">mark_email_read</span>
          <h2 style={{ ...s.heading, marginBottom: 'var(--space-4)' }}>Check your email</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)', lineHeight: 'var(--line-height-normal)' }}>
            We&rsquo;ve sent you a verification link. Click it to activate your account, then you can log in.
          </p>
          <Link
            href={loginHref}
            style={{ ...s.primaryBtn, display: 'inline-block', textDecoration: 'none', textAlign: 'center', maxWidth: 280 }}
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const pwStrength = getPasswordStrength(passwordVal);

  /* ─── UI ─── */
  return (
    <div style={s.wrapper}>
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div className="signup-brand-panel" style={s.brandPanel}>
        {/* Abstract background shapes */}
        <div style={s.brandShapes}>
          <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'rgba(173,44,77,0.15)', top: '-15%', left: '-10%' }} />
          <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', background: 'rgba(255,187,0,0.08)', bottom: '-5%', right: '-5%' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'rgba(75,155,255,0.06)', top: '40%', right: '20%' }} />
        </div>

        <div style={s.brandContent}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.9, marginBottom: 'var(--space-4)', display: 'block' }} aria-hidden="true">account_balance</span>
          <h1 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: 'var(--space-4)', letterSpacing: '-0.02em' }}>
            Career training at no cost for qualifying members
          </h1>
          <p style={{ fontSize: 'var(--font-size-base)', opacity: 0.75, lineHeight: 'var(--line-height-normal)' }}>
            Industry-recognized credentials. Career-changing programs. Funded through grants and partnerships so members are not charged.
          </p>
        </div>

        {/* Testimonial glass card */}
        <div style={s.testimonialCard}>
          <p style={{ fontSize: 'var(--font-size-base)', lineHeight: 'var(--line-height-normal)', fontStyle: 'italic', opacity: 0.9, margin: 0 }}>
            &ldquo;WorkforceAP gave me the skills and support to transition into a tech career. The program changed my life.&rdquo;
          </p>
          <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--font-size-sm)', opacity: 0.6, margin: 'var(--space-3) 0 0' }}>
            — Member, 2025
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.formPanel}>
        <div style={s.formContainer}>
          <h2 style={s.heading}>Create an account</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: '0 0 var(--space-6)', lineHeight: 'var(--line-height-normal)', fontSize: 'var(--font-size-sm)' }}>
            {isMemberSignup
              ? 'This creates your member portal account so you can apply, track progress, and use career tools.'
              : 'This page creates a member portal account. Staff, counselor, employer, and admin access are issued by WorkforceAP.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Full Name */}
            <div style={s.fieldGroup}>
              <label htmlFor="fullName" style={s.label}>Full Name</label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                style={s.input}
                {...register('fullName')}
              />
              {errors.fullName && <span id="fullName-error" role="alert" style={s.fieldError}>{errors.fullName.message}</span>}
            </div>

            {/* Email */}
            <div style={s.fieldGroup}>
              <label htmlFor="email" style={s.label}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                style={s.input}
                {...register('email')}
              />
              {errors.email && <span id="email-error" role="alert" style={s.fieldError}>{errors.email.message}</span>}
            </div>

            {/* Password with strength indicator */}
            <div style={s.fieldGroup}>
              <label htmlFor="password" style={s.label}>Password</label>
              <div style={s.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 8 characters"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  style={{ ...s.input, paddingRight: 'var(--space-8)' }}
                  {...register('password', {
                    onChange: (e) => setPasswordVal(e.target.value),
                  })}
                />
                <button
                  type="button"
                  style={s.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {/* Strength bars */}
              <div style={s.strengthRow}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: strengthColor(pwStrength, i), transition: 'background 0.3s' }} />
                ))}
              </div>
              <p style={s.hint}>Uppercase, lowercase, and a number required</p>
              {errors.password && <span id="password-error" role="alert" style={s.fieldError}>{errors.password.message}</span>}
            </div>

            {/* Phone */}
            <div style={s.fieldGroup}>
              <label htmlFor="phone" style={s.label}>
                Phone <span style={{ fontSize: '0.75rem', color: '#737373', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="(512) 555-1234"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                style={s.input}
                {...register('phone')}
              />
              {errors.phone && <span id="phone-error" role="alert" style={s.fieldError}>{errors.phone.message}</span>}
            </div>

            {/* ZIP */}
            <div style={s.fieldGroup}>
              <label htmlFor="zip" style={s.label}>
                ZIP Code <span style={{ fontSize: '0.75rem', color: '#737373', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="zip"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                placeholder="78701"
                aria-invalid={!!errors.zip}
                aria-describedby={errors.zip ? 'zip-error' : undefined}
                style={s.input}
                {...register('zip')}
              />
              {errors.zip && <span id="zip-error" role="alert" style={s.fieldError}>{errors.zip.message}</span>}
            </div>

            {/* Program Interest */}
            <div style={s.fieldGroup}>
              <label htmlFor="programInterest" style={s.label}>Program of Interest</label>
              <select
                id="programInterest"
                aria-invalid={!!errors.programInterest}
                aria-describedby={errors.programInterest ? 'programInterest-error' : undefined}
                style={s.select}
                {...register('programInterest')}
              >
                <option value="">Select a program...</option>
                {PROGRAM_INTEREST_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {errors.programInterest && <span id="programInterest-error" role="alert" style={s.fieldError}>{errors.programInterest.message}</span>}
            </div>

            {/* Employment */}
            <div style={s.fieldGroup}>
              <label htmlFor="employmentStatus" style={s.label}>Employment Status</label>
              <select id="employmentStatus" style={s.select} {...register('employmentStatus')}>
                <option value="">Select...</option>
                {EMPLOYMENT_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Veteran */}
            <div style={s.fieldGroup}>
              <label htmlFor="veteranStatus" style={s.label}>Veteran Status</label>
              <select id="veteranStatus" style={s.select} {...register('veteranStatus')}>
                <option value="">Select...</option>
                {VETERAN_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Consent checkboxes */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-3)' }}>
                <input
                  type="checkbox"
                  aria-invalid={!!errors.consentTerms}
                  aria-describedby={errors.consentTerms ? 'consentTerms-error' : undefined}
                  style={{ marginTop: 3, accentColor: 'var(--color-accent)' }}
                  {...register('consentTerms')}
                />
                <span>
                  I agree to the{' '}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link> *
                </span>
              </label>
              {errors.consentTerms && <span id="consentTerms-error" role="alert" style={s.fieldError}>{errors.consentTerms.message}</span>}

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
                <input type="checkbox" style={{ marginTop: 3, accentColor: 'var(--color-accent)' }} {...register('consentCommunications')} />
                <span>I agree to receive program updates and communications via email</span>
              </label>
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div role="alert" style={s.errorBanner}>{errorMessage}</div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitStatus === 'loading'}
              style={{ ...s.primaryBtn, opacity: submitStatus === 'loading' ? 0.7 : 1 }}
            >
              {submitStatus === 'loading' ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
            Already have an account?{' '}
            <Link href={loginHref} style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>

      {/* Responsive: hide brand panel on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .signup-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
