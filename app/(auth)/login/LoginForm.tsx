'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';

/* ─── portal destination data (unchanged business logic) ─── */
const PORTAL_DESTINATIONS: { redirectTo: string; title: string; desc: string }[] = [
  {
    redirectTo: '/admin',
    title: 'Admin portal',
    desc: 'Operations, member oversight, and back-office tools for workforce staff.',
  },
  {
    redirectTo: '/counselor',
    title: 'Counselor portal',
    desc: 'Member roster, messaging, and resources for counseling partners.',
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
  {
    redirectTo: '/dashboard',
    title: 'Member portal',
    desc: 'Training progress, learning hub, applications, and career tools after you enroll or apply.',
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
    color: 'var(--color-white)',
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
    border: '2px solid var(--outline-variant)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-on-surface)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
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
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: 'var(--color-on-surface-variant)',
    cursor: 'pointer',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    transition: 'color 0.2s',
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
    minHeight: '44px',
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
    background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
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

  trustBar: {
    marginTop: 'var(--space-3)',
    textAlign: 'center' as const,
    fontSize: '0.75rem',
    color: 'var(--color-on-surface-variant)',
    opacity: 0.65,
    letterSpacing: '0.01em',
  } as React.CSSProperties,

  trustDot: {
    margin: '0 var(--space-2)',
    opacity: 0.5,
  } as React.CSSProperties,
} as const;

type LoginFormProps = {
  initialRedirectTo?: string;
};

export default function LoginForm({ initialRedirectTo = '/dashboard' }: LoginFormProps) {
  /* ─── business logic (preserved exactly) ─── */
  const redirectTo = sanitizeRedirectPath(initialRedirectTo, '/dashboard');
  const redirectParam = initialRedirectTo;

  const destinationActive = (target: string) => {
    if (target === '/dashboard') {
      return redirectParam == null || redirectParam === '' || redirectTo === '/dashboard';
    }
    return redirectTo === target;
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStaffPortals, setShowStaffPortals] = useState(
    () => redirectTo !== '/dashboard',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Inline field validation — calm, member-friendly messages
    let hasFieldError = false;
    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      hasFieldError = true;
    }
    if (!password) {
      setPasswordError('Please enter your password.');
      hasFieldError = true;
    }
    if (hasFieldError) return;

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wap-login-flow': 'client',
        },
        body: JSON.stringify({ email, password, redirectTo, rememberMe }),
        credentials: 'include',
        redirect: 'manual',
      });

      const data = await res.json().catch(() => ({}));

      if (res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400)) {
        const location = res.headers.get('Location') ?? data?.redirectTo;
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

      if (!res.ok) {
        setError(data.error ?? "We couldn't sign you in right now. Try again in a moment.");
        setLoading(false);
        return;
      }

      const nextLocation = typeof data?.redirectTo === 'string' ? data.redirectTo : redirectTo;
      window.location.href = new URL(nextLocation, window.location.origin).href;
    } catch {
      setError("We couldn't connect. Check your connection and try again.");
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
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">verified_user</span>
            Trusted &amp; Secure
          </div>
          <h1 style={{ ...s.brandHeading, marginTop: 'var(--space-6)' }}>
            Your Career Starts Here
          </h1>
          <p style={{ fontSize: 'var(--font-size-base)', opacity: 0.8, lineHeight: 'var(--line-height-normal)' }}>
            Workforce Advancement Project — career training, certificates, and job placement support at no cost to members.
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

          {/* Portal routing — staff portals hidden behind toggle */}
          <nav aria-label="Choose portal destination after sign-in" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', alignItems: 'center' }}>
              {PORTAL_DESTINATIONS.filter((o) =>
                o.redirectTo === '/dashboard' || showStaffPortals
              ).map((o) => {
                const href = `/login?redirectTo=${encodeURIComponent(o.redirectTo)}`;
                const active = destinationActive(o.redirectTo);
                return (
                  <Link
                    key={o.redirectTo}
                    href={href}
                    aria-current={active || undefined}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      minHeight: 44,
                      padding: '6px 12px',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: active ? '1px solid var(--color-accent)' : '1px solid var(--outline-variant)',
                      background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'transparent',
                      color: active ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                      textDecoration: 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {o.title.replace(' portal', '')}
                  </Link>
                );
              })}
              {!showStaffPortals && (
                <button
                  type="button"
                  onClick={() => setShowStaffPortals(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: 44,
                    padding: '6px 12px',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--outline-variant)',
                    background: 'transparent',
                    color: 'var(--color-on-surface-variant)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Staff login
                </button>
              )}
            </div>
          </nav>

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={s.fieldGroup}>
              <label htmlFor="email" style={s.label}>Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                required
                aria-invalid={!!emailError || !!error}
                aria-describedby={emailError ? 'email-error' : error ? 'login-error' : undefined}
                className="login-field"
                style={{ ...s.input, ...(emailError ? { borderColor: 'var(--color-accent)' } : {}) }}
              />
              {emailError && (
                <p id="email-error" role="alert" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginTop: 'var(--space-1)', margin: 'var(--space-1) 0 0' }}>
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={s.fieldGroup}>
              <div style={s.passwordRow}>
                <label htmlFor="password" style={{ ...s.label, marginBottom: 0 }}>Password</label>
                <Link href="/forgot-password" style={s.recoverLink}>Forgot password?</Link>
              </div>
              <div style={s.passwordWrap}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(null); }}
                  required
                  aria-invalid={!!passwordError || !!error}
                  aria-describedby={passwordError ? 'password-error' : error ? 'login-error' : undefined}
                  className="login-field"
                  style={{ ...s.input, ...(passwordError ? { borderColor: 'var(--color-accent)' } : {}) }}
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
              {passwordError && (
                <p id="password-error" role="alert" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)', marginTop: 'var(--space-1)', margin: 'var(--space-1) 0 0' }}>
                  {passwordError}
                </p>
              )}
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
                Stay signed in for 7 days
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
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Trust bar — reassurance at the moment of login friction */}
          <p style={s.trustBar} aria-label="Program credentials">
            <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 'var(--space-1)' }} aria-hidden="true">lock</span>
            Secure
            <span style={s.trustDot} aria-hidden="true">·</span>
            No-cost to members
            <span style={s.trustDot} aria-hidden="true">·</span>
            Government-funded program
          </p>

          {/* Bottom links */}
          <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)', color: 'var(--color-on-surface-variant)' }}>
            First time here?{' '}
            <Link href="/signup" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none' }}>
              Sign Up
            </Link>
          </p>

          {/* Footer — minimal; status dot removed (meaningless to members) */}
        </div>
      </div>

      {/* Responsive: hide brand panel on mobile; accessible focus rings */}
      <style>{`
        @media (max-width: 768px) {
          .login-brand-panel { display: none !important; }
        }
        .login-field:focus {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
          border-color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
