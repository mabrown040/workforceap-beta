'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const PORTAL_DESTINATIONS: { redirectTo: string; title: string; desc: string }[] = [
  {
    redirectTo: '/dashboard',
    title: 'Member (student) portal',
    desc: 'Training progress, learning hub, applications, and career tools after you enroll or apply.',
  },
  {
    redirectTo: '/partner',
    title: 'Partner portal',
    desc: 'Referrals you sent us, member progress, and accountability views for your organization.',
  },
  {
    redirectTo: '/employer',
    title: 'Employer portal',
    desc: 'Job postings, Workforce AP applicants, and hiring workflows for your company.',
  },
];

export default function LoginForm() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirectTo');
  const redirectTo =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//') ? redirectParam : '/dashboard';

  const destinationActive = (target: string) => {
    if (target === '/dashboard') {
      return (
        redirectParam == null ||
        redirectParam === '' ||
        redirectParam === '/dashboard' ||
        !(redirectParam.startsWith('/') && !redirectParam.startsWith('//'))
      );
    }
    return redirectParam === target;
  };

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
          <h1>Sign in to WorkforceAP</h1>
          <p>
            One email and password for every portal. Choose where you want to land below, then enter your credentials.
          </p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <nav className="login-portal-routing" aria-label="Choose portal destination after sign-in">
            <h2 className="login-portal-routing__title">Where are you signing in?</h2>
            <p className="login-portal-routing__lead">
              Pick the experience that matches your role. If your account has more than one portal, you can switch after
              you are logged in.
            </p>
            <ul className="login-portal-routing__grid">
              {PORTAL_DESTINATIONS.map((o) => {
                const href = `/login?redirectTo=${encodeURIComponent(o.redirectTo)}`;
                return (
                  <li key={o.redirectTo} className="login-portal-routing__item">
                    <Link
                      href={href}
                      className={`login-portal-routing__link${destinationActive(o.redirectTo) ? ' login-portal-routing__link--active' : ''}`}
                      aria-current={destinationActive(o.redirectTo) || undefined}
                    >
                      <span className="login-portal-routing__item-title">{o.title}</span>
                      <span className="login-portal-routing__item-desc">{o.desc}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

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
