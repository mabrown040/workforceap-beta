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

const EMPLOYMENT_OPTIONS = [
  'Employed full-time',
  'Employed part-time',
  'Unemployed',
  'Student',
  'Self-employed',
  'Other',
];

const VETERAN_OPTIONS = ['Yes', 'No', 'Prefer not to say'];

export default function MemberSignupForm() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    try {
      const res = await fetch('/api/member/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setSubmitStatus('error');
        setErrorMessage(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (submitStatus === 'success') {
    return (
      <div
        className="member-signup-success"
        style={{
          background: 'var(--color-light)',
          padding: '2rem',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
        }}
      >
        <h3 style={{ color: 'var(--color-green)', marginBottom: '1rem' }}>
          Check your email
        </h3>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
          We&apos;ve sent you a verification link. Click it to activate your account, then you can log in.
        </p>
        <Link href="/login" className="btn btn-primary">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="member-signup-form"
      noValidate
    >
      <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
        <legend className="sr-only">Account information</legend>
        <div className="form-group">
          <label htmlFor="fullName">Full name *</label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
            {...register('fullName')}
          />
          {errors.fullName && (
            <span id="fullName-error" className="form-error" role="alert">
              {errors.fullName.message}
            </span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <span id="email-error" className="form-error" role="alert">
              {errors.email.message}
            </span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="password">Password *</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          <p className="form-hint">
            At least 8 characters with uppercase, lowercase, and a number
          </p>
          {errors.password && (
            <span id="password-error" className="form-error" role="alert">
              {errors.password.message}
            </span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone *</label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(512) 555-1234"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            {...register('phone')}
          />
          {errors.phone && (
            <span id="phone-error" className="form-error" role="alert">
              {errors.phone.message}
            </span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="zip">ZIP code *</label>
          <input
            id="zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="78701"
            aria-invalid={!!errors.zip}
            aria-describedby={errors.zip ? 'zip-error' : undefined}
            {...register('zip')}
          />
          {errors.zip && (
            <span id="zip-error" className="form-error" role="alert">
              {errors.zip.message}
            </span>
          )}
        </div>
      </fieldset>

      <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
        <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-accent)', marginBottom: '1rem' }}>
          Program interest
        </legend>
        <div className="form-group">
          <label htmlFor="programInterest">Which program interests you most? *</label>
          <select
            id="programInterest"
            aria-invalid={!!errors.programInterest}
            aria-describedby={errors.programInterest ? 'programInterest-error' : undefined}
            {...register('programInterest')}
          >
            <option value="">Select a program&hellip;</option>
            {PROGRAM_INTEREST_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {errors.programInterest && (
            <span id="programInterest-error" className="form-error" role="alert">
              {errors.programInterest.message}
            </span>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="employmentStatus">Employment status</label>
          <select id="employmentStatus" {...register('employmentStatus')}>
            <option value="">Select&hellip;</option>
            {EMPLOYMENT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="veteranStatus">Veteran status</label>
          <select id="veteranStatus" {...register('veteranStatus')}>
            <option value="">Select&hellip;</option>
            {VETERAN_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset style={{ border: 'none', padding: 0, marginBottom: '1.5rem' }}>
        <legend style={{ fontWeight: 700, fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-accent)', marginBottom: '1rem' }}>
          Consent
        </legend>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              aria-invalid={!!errors.consentTerms}
              aria-describedby={errors.consentTerms ? 'consentTerms-error' : undefined}
              {...register('consentTerms')}
            />
            <span>
              I agree to the{' '}
              <Link href="/contact" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/contact" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </Link>{' '}
              *
            </span>
          </label>
          {errors.consentTerms && (
            <span id="consentTerms-error" className="form-error" role="alert">
              {errors.consentTerms.message}
            </span>
          )}
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" {...register('consentCommunications')} />
            <span>I agree to receive program updates and communications via email</span>
          </label>
        </div>
      </fieldset>

      {errorMessage && (
        <div className="form-error-banner" role="alert" style={{ background: '#fff3f5', borderLeft: '4px solid var(--color-accent)', padding: '1rem', marginBottom: '1rem', borderRadius: '0 8px 8px 0' }}>
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '1rem', fontSize: '1.05rem' }}
        disabled={submitStatus === 'loading'}
      >
        {submitStatus === 'loading' ? 'Creating account…' : 'Create account'}
      </button>

      <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-gray-500)', fontSize: '.9rem' }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
