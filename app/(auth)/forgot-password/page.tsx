'use client';

import { fetchAuth } from '@/lib/fetchWithTimeout';
import { useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LocalizedLink from '@/components/LocalizedLink';

function ForgotPasswordForm() {
  const tAuth = useTranslations('auth');
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get('email') ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Inline validation — calm, member-friendly message; matches the
    // pattern used on the login form.
    if (!email.trim() || !email.includes('@')) {
      setEmailError(tAuth('forgotPassword.emailRequired'));
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    setStatus('loading');

    try {
      const res = await fetchAuth('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? tAuth('forgotPassword.sendFailed'));
        emailRef.current?.focus();
        return;
      }

      setSuccessMessage(
        typeof data?.message === 'string' ? data.message : tAuth('forgotPassword.successFallbackMessage')
      );
      setStatus('success');
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : tAuth('forgotPassword.sendFailed');
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setError(tAuth('forgotPassword.networkError'));
      } else {
        setError(tAuth('forgotPassword.sendFailed'));
      }
      emailRef.current?.focus();
    }
  };

  if (status === 'success') {
    return (
      <div className="inner-page">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>{tAuth('forgotPassword.successHeading')}</h1>
            <p>{successMessage}</p>
            <LocalizedLink href="/login" className="btn btn-primary" style={{ marginTop: '1rem', minHeight: 44 }}>
              {tAuth('forgotPassword.backToLogin')}
            </LocalizedLink>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>{tAuth('forgotPassword.heading')}</h1>
          <p>{tAuth('forgotPassword.subheading')}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="apply-form">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="email">{tAuth('forgotPassword.emailLabel')} *</label>
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                    required
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : error ? 'forgot-password-error' : undefined}
                  />
                  {emailError && (
                    <p id="email-error" role="alert" className="form-error">
                      {emailError}
                    </p>
                  )}
                </div>
                {error && (
                  <div id="forgot-password-error" className="form-error-banner" role="alert" style={{ background: 'var(--surface-container)', borderLeft: '4px solid var(--color-accent)', padding: '1rem', marginBottom: '1rem', borderRadius: '0 8px 8px 0' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem', minHeight: 44 }}
                  disabled={status === 'loading'}
                  aria-busy={status === 'loading'}
                >
                  <span aria-live="polite">{status === 'loading' ? tAuth('forgotPassword.sending') : tAuth('forgotPassword.submit')}</span>
                </button>
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <LocalizedLink href="/login">{tAuth('forgotPassword.backToLogin')}</LocalizedLink>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ForgotPasswordLoadingFallback() {
  const tAuth = useTranslations('auth');
  return (
    <div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      {tAuth('forgotPassword.loading')}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordLoadingFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
