'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get('email') ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('loading');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setError(data.error ?? "We couldn't send the reset link. Try again in a moment.");
        return;
      }

      setSuccessMessage(
        typeof data?.message === 'string'
          ? data.message
          : 'If an account exists for that email, you will receive reset instructions shortly.'
      );
      setStatus('success');
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : "We couldn't send the reset link. Try again in a moment.";
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setError("We couldn't connect. Check your connection and try again.");
      } else {
        setError("We couldn't send the reset link. Try again in a moment.");
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="inner-page">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>Check your email</h1>
            <p>{successMessage}</p>
            <LocalizedLink href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Back to login
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
          <h1>Reset your password</h1>
          <p>Enter your email and we&rsquo;ll send you a link to reset your password.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="apply-form">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="form-error-banner" role="alert" style={{ background: 'var(--surface-container)', borderLeft: '4px solid var(--color-accent)', padding: '1rem', marginBottom: '1rem', borderRadius: '0 8px 8px 0' }}>
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem' }}
                  disabled={status === 'loading'}
                >
                  {status === 'loading' ? 'Sending…' : 'Send reset link'}
                </button>
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <LocalizedLink href="/login">Back to login</LocalizedLink>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>Loading…</div>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
