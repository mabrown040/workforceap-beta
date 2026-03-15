'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      // Hard navigation ensures middleware sees new cookies (fixes mobile/cross-tab)
      window.location.href = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Log in to your account</h1>
          <p>Access your member dashboard, application status, and resources.</p>
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          >
            <strong>Thanks for signing up!</strong> We&apos;re building this page out soon. Check back for updates.
          </div>
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
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Log in'}
                </button>
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <Link href="/forgot-password">Forgot password?</Link>
                </p>
                <p style={{ textAlign: 'center', marginTop: '0.5rem', color: 'var(--color-gray-500)', fontSize: '.9rem' }}>
                  Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
