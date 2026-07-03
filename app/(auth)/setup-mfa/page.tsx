'use client';

import { fetchAuth } from '@/lib/fetchWithTimeout';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import LocalizedLink from '@/components/LocalizedLink';
import { sanitizeRedirectPath } from '@/lib/auth/safeRedirectPath';
import { trackFunnelEvent } from '@/lib/analytics/events';

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
    trackFunnelEvent('member_login_mfa', 'setup_started');

    fetchAuth('/api/auth/setup-mfa', { method: 'POST' })
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
        trackFunnelEvent('member_login_mfa', 'setup_init_failed', {
          error_message: e?.message?.slice(0, 120) ?? 'unknown',
        });
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
      const res = await fetchAuth('/api/auth/setup-mfa', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factorId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Invalid code. Please try again.');
        trackFunnelEvent('member_login_mfa', 'setup_confirm_failed', {
          status_code: res.status,
        });
        setLoading(false);
        return;
      }

      trackFunnelEvent('member_login_mfa', 'setup_completed');
      setStep('done');
    } catch {
      setError('Something went wrong. Please try again.');
      trackFunnelEvent('member_login_mfa', 'setup_network_error');
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
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 48, color: 'var(--color-error)', marginBottom: '0.5rem' }}>error</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Setup Failed</h1>
          <p role="alert" style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>{error}</p>
          <LocalizedLink href={nextPath} style={{ color: 'var(--color-accent)', fontWeight: 600 }}>Continue</LocalizedLink>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 64, color: 'var(--color-green)', marginBottom: '1rem' }}>check_circle</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>2FA Enabled</h1>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1.5rem' }}>
            Two-factor authentication is now active on your account. You'll need your authenticator app each time you sign in.
          </p>
          <LocalizedLink
            href={nextPath}
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #c79a45 0%, #a47f38 55%, #7d5f26 100%)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textDecoration: 'none',
              boxShadow: '0 12px 30px -12px rgba(124, 92, 38, 0.5)',
            }}
          >
            Continue
          </LocalizedLink>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-lowest)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 48, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>qr_code_2</span>
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
                  <Image src={qrCode} alt="MFA QR Code" width={200} height={200} unoptimized style={{ display: 'block' }} />
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
                background: 'linear-gradient(135deg, #c79a45 0%, #a47f38 55%, #7d5f26 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                marginBottom: '0.75rem',
                boxShadow: '0 12px 30px -12px rgba(124, 92, 38, 0.5)',
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
                aria-label="6-digit MFA code"
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
              <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              aria-busy={loading}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: loading || code.length !== 6 ? 'var(--surface-container-high)' : 'linear-gradient(135deg, #c79a45 0%, #a47f38 55%, #7d5f26 100%)',
                color: loading || code.length !== 6 ? 'var(--color-on-surface-variant)' : '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
                boxShadow: loading || code.length !== 6 ? 'none' : '0 12px 30px -12px rgba(124, 92, 38, 0.5)',
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
