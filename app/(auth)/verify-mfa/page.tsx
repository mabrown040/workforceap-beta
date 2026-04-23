'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function VerifyMfaPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  // Redirect to login if no active session (no aal1 session)
  useEffect(() => {
    fetch('/api/auth/check-mfa-required')
      .then((r) => {
        if (!r.ok) window.location.href = '/login';
      })
      .catch(() => { window.location.href = '/login'; });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, trustDevice }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Verification failed. Try again.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Redirect to admin or dashboard after brief delay
      setTimeout(() => {
        window.location.href = '/admin';
      }, 800);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-lowest)' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--color-green)', marginBottom: '1rem' }}>check_circle</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Verified</h1>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>Redirecting to your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-lowest)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>security</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Two-Factor Authentication</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              autoFocus
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '0.15em',
                textAlign: 'center',
                background: 'var(--surface-container)',
                border: '2px solid var(--outline-variant)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-on-surface)',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>
          )}

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              marginBottom: '1rem',
              fontSize: '0.85rem',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            <input
              type="checkbox"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              style={{ marginTop: '0.15rem' }}
            />
            <span>Remember this device for 7 days so admin MFA is not required on every sign-in.</span>
          </label>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: loading || code.length !== 6 ? 'var(--surface-container-high)' : 'var(--color-accent)',
              color: loading || code.length !== 6 ? 'var(--color-on-surface-variant)' : '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
          Lost your authenticator? <Link href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Sign in again</Link>
        </p>
      </div>
    </div>
  );
}
