'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ email, password, redirectTo }),
        credentials: 'include',
        redirect: 'manual',
      });

      if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
        const location = res.headers.get('Location');
        window.location.href =
          location && location.startsWith('/')
            ? new URL(location, window.location.origin).href
            : redirectTo.startsWith('/')
              ? redirectTo
              : `/${redirectTo}`;
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

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
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <div className="login-password-field">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      aria-invalid={!!error}
                      aria-describedby={error ? 'login-error' : undefined}
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div
                    id="login-error"
                    className="form-error-banner"
                    role="alert"
                    style={{
                      background: '#fff3f5',
                      borderLeft: '4px solid var(--color-accent)',
                      padding: '1rem',
                      marginBottom: '1rem',
                      borderRadius: '0 8px 8px 0',
                    }}
                  >
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
                <div className="login-form-footer-links">
                  <Link href="/forgot-password">Forgot password?</Link>
                  <p className="login-form-footer-links-muted">
                    Don&apos;t have an account? <Link href="/signup">Sign up</Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
