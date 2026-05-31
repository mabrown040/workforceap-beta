'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { normalizePostLoginRedirect } from '@/lib/auth/postLoginRedirect';

type Stage = 'verifying' | 'ready' | 'submitting' | 'success' | 'error';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [stage, setStage] = useState<Stage>('verifying');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const invalidLinkMessage = 'This reset link is invalid or has expired. Please request a new one.';
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {
        setVerifyError(null);
        setStage('ready');
      }
    });

    async function exchangeToken() {
      const code = searchParams?.get('code');
      const tokenHash = searchParams?.get('token_hash');
      const type = searchParams?.get('type');
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const hashType = hashParams.get('type');

      if (accessToken && refreshToken && hashType === 'recovery') {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!active) return;
        if (error) {
          setVerifyError(invalidLinkMessage);
          setStage('error');
          return;
        }
        window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
        setVerifyError(null);
        setStage('ready');
        return;
      }

      if (tokenHash && type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (!active) return;
        if (error) {
          setVerifyError(invalidLinkMessage);
          setStage('error');
        } else {
          setVerifyError(null);
          setStage('ready');
        }
        return;
      }

      if (code) {
        const codeType = searchParams?.get('type');
        if (codeType !== 'recovery') {
          setVerifyError(invalidLinkMessage);
          setStage('error');
          return;
        }
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (error) {
          setVerifyError(invalidLinkMessage);
          setStage('error');
        } else {
          setVerifyError(null);
          setStage('ready');
        }
        return;
      }

      setVerifyError('No password reset token found. Please request a new reset link.');
      setStage('error');
    }

    void exchangeToken();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.');
      return;
    }

    setStage('submitting');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(error.message ?? 'Could not update password. Please try again.');
      setStage('ready');
      return;
    }

    setStage('success');
    const target = normalizePostLoginRedirect(searchParams?.get('redirectTo'));
    setTimeout(() => router.push(target), 2000);
  }

  if (stage === 'verifying') {
    return (
      <div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <p>Verifying your reset link…</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="inner-page">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>Link invalid or expired</h1>
            <p>{verifyError}</p>
            <LocalizedLink href="/forgot-password" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Request a new reset link
            </LocalizedLink>
          </div>
        </section>
      </div>
    );
  }

  if (stage === 'success') {
    return (
      <div className="inner-page">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>Password updated</h1>
            <p>Your password has been changed. Taking you to your dashboard…</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>Set new password</h1>
          <p>Choose a new password for your account.</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="apply-form">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="new-password">New password *</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    At least 8 characters
                  </p>
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm new password *</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                {formError && (
                  <div
                    className="form-error-banner"
                    role="alert"
                    style={{
                      background: 'var(--surface-container)',
                      borderLeft: '4px solid var(--color-accent)',
                      padding: '1rem',
                      marginBottom: '1rem',
                      borderRadius: '0 8px 8px 0',
                    }}
                  >
                    {formError}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '1rem' }}
                  disabled={stage === 'submitting'}
                >
                  {stage === 'submitting' ? 'Saving…' : 'Save new password'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
