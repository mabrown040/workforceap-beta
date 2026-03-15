'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        setError(
          'Network error. Check your connection and try again. If this persists, ensure your site URL is in Supabase Auth → URL Configuration → Redirect URLs.'
        );
      } else {
        setError(msg);
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="inner-page">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>Check your email</h1>
            <p>We&apos;ve sent a password reset link to {email}. Click the link to set a new password.</p>
            <Link href="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Back to login
            </Link>
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
          <p>Enter your email and we&apos;ll send you a link to reset your password.</p>
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="form-error-banner" role="alert" style={{ background: '#fff3f5', borderLeft: '4px solid var(--color-accent)', padding: '1rem', marginBottom: '1rem', borderRadius: '0 8px 8px 0' }}>
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
                  <Link href="/login">Back to login</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
