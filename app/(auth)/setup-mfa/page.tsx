'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';

function getMfaSetupNextPath() {
  if (typeof window === 'undefined') return '/dashboard';
  return sanitizeRedirectPath(new URLSearchParams(window.location.search).get('next'), '/dashboard');
}

export default function SetupMfaPage() {
  const [step, setStep] = useState<'loading' | 'qr' | 'confirm' | 'done' | 'error'>('loading');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextPath, setNextPath] = useState('/dashboard');

  useEffect(() => {
    setNextPath(getMfaSetupNextPath());

    fetch('/api/auth/setup-mfa', { method: 'POST' })
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to start MFA setup.');
        }
        return r.json();
      })
      .then((data) => {
        setQrCode(data.qr);
        setSecret(data.secret);
        setFactorId(data.factorId);
        setStep('qr');
      })
      .catch((e) => {
        setError(e.message);
        setStep('error');
      });
  }, []);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/setup-mfa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Invalid code. Please try again.');
        setLoading(false);
        return;
      }

      setStep('done');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Setting up two-factor authentication…</p>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-error)', marginBottom: '0.5rem' }}>error</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Setup Failed</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>{error}</p>
          <Link href={nextPath} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Continue</Link>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--color-green)', marginBottom: '1rem' }}>check_circle</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>2FA Enabled</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Two-factor authentication is now active on your account. You'll need your authenticator app each time you sign in.
          </p>
          <Link
            href={nextPath}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Continue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-lowest)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>qr_code_2</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Set Up Two-Factor Authentication</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0.25rem 0 0' }}>
            Required for admin and counselor accounts. Scan the QR code with your authenticator app.
          </p>
        </div>

        {step === 'qr' && (
          <>
            {/* QR Code */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'inline-block',
                  background: '#fff',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--outline-variant)',
                }}
              >
                {qrCode ? (
                  <img src={qrCode} alt="MFA QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                ) : (
                  <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-variant)' }}>
                    Loading QR…
                  </div>
                )}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.5rem' }}>
                Can't scan? Enter this code manually: <code style={{ background: 'var(--surface-container-high)', padding: '0.15rem 0.35rem', borderRadius: 4, fontFamily: 'monospace' }}>{secret}</code>
              </p>
            </div>

            <button type="button"
              onClick={() => setStep('confirm')}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: 'var(--color-accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginBottom: '0.75rem',
              }}
            >
              I've scanned the code
            </button>
          </>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirm} noValidate>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem', textAlign: 'center' }}>
              Enter the 6-digit code from your authenticator app to confirm setup.
            </p>

            <div style={{ marginBottom: '1rem' }}>
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

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              aria-busy={loading}
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
              <span aria-live="polite">{loading ? 'Verifying…' : 'Enable 2FA'}</span>
            </button>

            <button
              type="button"
              onClick={() => setStep('qr')}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'transparent',
                color: 'var(--color-on-surface-variant)',
                border: 'none',
                fontSize: '0.8rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              Back to QR code
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          Recommended apps: Google Authenticator, Authy, 1Password
        </p>
      </div>
    </div>
  );
}
