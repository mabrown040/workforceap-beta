'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';

/* ─── portal destination data (unchanged business logic) ─── */
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

function portalTitleForPath(path: string): string {
  for (const o of PORTAL_DESTINATIONS) {
    if (o.redirectTo === '/dashboard') continue;
    if (path === o.redirectTo || path.startsWith(`${o.redirectTo}/`)) {
      return o.title;
    }
  }
  return PORTAL_DESTINATIONS.find((o) => o.redirectTo === '/dashboard')!.title;
}

/* ─── styles ─── */
const s = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'var(--font-family)',
  } as React.CSSProperties,

  /* Left branding panel */
  brandPanel: {
    flex: '1 1 50%',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 'var(--space-16) var(--space-8)',
    background: 'linear-gradient(135deg, var(--color-primary) 0%, #2a0a14 50%, var(--color-accent-dark) 100%)',
    overflow: 'hidden',
    color: '#fff',
  } as React.CSSProperties,

  brandBgOverlay: {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: 'url(/images/hero-people.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.12,
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  brandContent: {
    position: 'relative' as const,
    zIndex: 1,
    textAlign: 'center' as const,
    maxWidth: 440,
  } as React.CSSProperties,

  brandHeading: {
    fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
    fontWeight: 800,
    lineHeight: 1.15,
    marginBottom: 'var(--space-6)',
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  brandBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--radius-xl)',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  } as React.CSSProperties,

  /* Right form panel */
  formPanel: {
    flex: '1 1 50%',
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
    maxWidth: 420,
  } as React.CSSProperties,

  heading: {
    fontSize: 'var(--font-size-h2)',
    fontWeight: 800,
    color: 'var(--color-on-surface)',
    marginBottom: 'var(--space-1)',
  } as React.CSSProperties,

  subheading: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-on-surface-variant)',
    marginBottom: 'var(--space-8)',
    lineHeight: 'var(--line-height-normal)',
  } as React.CSSProperties,

  label: {
    display: 'block',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    color: 'var(--color-on-surface-variant)',
    marginBottom: 'var(--space-1)',
    letterSpacing: '0.03em',
    textTransform: 'uppercase' as const,
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

  passwordRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--space-1)',
  } as React.CSSProperties,

  passwordWrap: {
    position: 'relative' as const,
  } as React.CSSProperties,

  passwordToggle: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--color-on-surface-variant)',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  } as React.CSSProperties,

  recoverLink: {
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-accent)',
    textDecoration: 'none',
    fontWeight: 500,
  } as React.CSSProperties,

  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    margin: 'var(--space-6) 0',
  } as React.CSSProperties,

  primaryBtn: {
    width: '100%',
    padding: 'var(--space-4)',
    fontSize: 'var(--font-size-base)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    color: '#fff',
    background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-dark) 100%)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  } as React.CSSProperties,

  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    margin: 'var(--space-6) 0',
    color: 'var(--color-on-surface-variant)',
    fontSize: 'var(--font-size-sm)',
  } as React.CSSProperties,

  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--outline-variant)',
  } as React.CSSProperties,

  socialRow: {
    display: 'flex',
    gap: 'var(--space-3)',
  } as React.CSSProperties,

  socialBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    padding: 'var(--space-3) var(--space-4)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    background: 'var(--surface-container)',
    border: '1px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-on-surface)',
    cursor: 'pointer',
    transition: 'background 0.2s',
  } as React.CSSProperties,

  footer: {
    marginTop: 'var(--space-8)',
    textAlign: 'center' as const,
    fontSize: 'var(--font-size-sm)',
    color: 'var(--color-on-surface-variant)',
  } as React.CSSProperties,

  statusDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'var(--color-green)',
    marginRight: 'var(--space-2)',
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

  fieldGroup: {
    marginBottom: 'var(--space-4)',
  } as React.CSSProperties,
} as const;

export default function LoginForm() {
  /* ─── business logic (preserved exactly) ─── */
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirectTo');
  const redirectTo = sanitizeRedirectPath(redirectParam, '/dashboard');

  const destinationActive = (target: string) => {
    if (target === '/dashboard') {
      return redirectParam == null || redirectParam === '' || redirectTo === '/dashboard';
    }
    return redirectTo === target;
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
        if (location) {
          try {
            const next = new URL(location, window.location.origin);
            if (next.origin === window.location.origin) {
              window.location.href = next.href;
              return;
            }
          } catch {
            /* ignore malformed Location */
          }
        }
        window.location.href = new URL(redirectTo, window.location.origin).href;
        return;
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      window.location.href = redirectTo;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  /* ─── UI ─── */
  return (
    <div style={s.wrapper}>
      {/* ── Left branding panel (hidden on mobile via CSS media query below) ── */}
      <div className="login-brand-panel" style={s.brandPanel}>
        <div style={s.brandBgOverlay} />
        <div style={s.brandContent}>
          <div style={s.brandBadge}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
            Enterprise Trust
          </div>
          <h1 style={{ ...s.brandHeading, marginTop: 'var(--space-6)' }}>
            Authority in the Digital Era
          </h1>
          <p style={{ fontSize: 'var(--font-size-base)', opacity: 0.8, lineHeight: 'var(--line-height-normal)' }}>
            Workforce Advancement Project — empowering careers through industry-recognized credentials.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={s.formPanel}>
        <div style={s.formContainer}>
          <h2 style={s.heading}>Welcome Back</h2>
          <p style={s.subheading}>
            Signing in to: <strong style={{ color: 'var(--color-accent)' }}>{portalTitleForPath(redirectTo)}</strong>
          </p>

          {/* Portal routing (collapsed) */}
          <nav aria-label="Choose portal destination after sign-in" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 'var(--space-2)' }}>
              {PORTAL_DESTINATIONS.map((o) => {
                const href = `/login?redirectTo=${encodeURIComponent(o.redirectTo)}`;
                const active = destinationActive(o.redirectTo);
                return (
                  <Link
                    key={o.redirectTo}
                    href={href}
                    aria-current={active || undefined}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: active ? '1px solid var(--color-accent)' : '1px solid var(--outline-variant)',
                      background: active ? 'rgba(173,44,77,0.12)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {o.title.replace(' portal', '')}
                  </Link>
                );
              })}
            </div>
          </nav>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={s.fieldGroup}>
              <label htmlFor="email" style={s.label}>Institutional ID</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-invalid={!!error}
                aria-describedby="login-error"
                style={s.input}
              />
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <div style={s.passwordRow}>
                <label htmlFor="password" style={{ ...s.label, marginBottom: 0 }}>Access Key</label>
                <Link href="/forgot-password" style={s.recoverLink}>Recover Key?</Link>
              </div>
              <div style={s.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  aria-invalid={!!error}
                  aria-describedby="login-error"
                  style={s.input}
                />
                <button
                  type="button"
                  style={s.passwordToggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Maintain session checkbox */}
            <div style={s.checkboxRow}>
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: 'var(--color-accent)' }}
              />
              <label htmlFor="remember" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', cursor: 'pointer' }}>
                Maintain session
              </label>
            </div>

            {/* Error banner */}
            {error && (
              <div id="login-error" role="alert" style={s.errorBanner}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Authenticating...' : 'AUTHENTICATE ACCESS'}
            </button>
          </form>

          {/* Third-party divider */}
          <div style={s.divider}>
            <span style={s.dividerLine} />
            <span>or verify with</span>
            <span style={s.dividerLine} />
          </div>

          {/* Social buttons */}
          <div style={s.socialRow}>
            <button type="button" style={s.socialBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>domain</span>
              Institutional
            </button>
            <button type="button" style={s.socialBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>fingerprint</span>
              Biometric
            </button>
          </div>

          {/* Bottom links */}
          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
            First time here?{' '}
            <Link href="/signup" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Request Credentials
            </Link>
          </p>

          {/* Footer status */}
          <div style={s.footer}>
            <span style={s.statusDot} />
            Network Operational
          </div>
        </div>
      </div>

      {/* Responsive: hide brand panel on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .login-brand-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}
