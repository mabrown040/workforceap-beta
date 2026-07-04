'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import LocalizedLink from '@/components/LocalizedLink';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { normalizePostLoginRedirect } from '@/lib/auth/postLoginRedirect';

type Stage = 'verifying' | 'ready' | 'submitting' | 'success' | 'error';

function ResetPasswordForm() {
  const tAuth = useTranslations('auth');
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowserClient()).current;

  const [stage, setStage] = useState<Stage>('verifying');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const invalidLinkMessage = tAuth('resetPassword.linkInvalidMessage');
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

      setVerifyError(tAuth('resetPassword.noTokenMessage'));
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
      setFormError(tAuth('resetPassword.passwordTooShort'));
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirm) {
      setFormError(tAuth('resetPassword.passwordMismatch'));
      confirmRef.current?.focus();
      return;
    }

    setStage('submitting');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(error.message ?? tAuth('resetPassword.updateFailed'));
      setStage('ready');
      passwordRef.current?.focus();
      return;
    }

    setStage('success');
    const target = normalizePostLoginRedirect(searchParams?.get('redirectTo'));
    setTimeout(() => router.push(target), 2000);
  }

  if (stage === 'verifying') {
    return (
      <div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 className="sr-only">{tAuth('resetPassword.verifying')}</h1>
        <p>{tAuth('resetPassword.verifying')}</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="inner-page">
        <section className="page-hero">
          <div className="page-hero-content">
            <h1>{tAuth('resetPassword.linkInvalidHeading')}</h1>
            <p role="alert">{verifyError}</p>
            <LocalizedLink href="/forgot-password" className="btn btn-primary" style={{ marginTop: '1rem', minHeight: 44 }}>
              {tAuth('resetPassword.requestNewLink')}
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
            <h1>{tAuth('resetPassword.successHeading')}</h1>
            <p role="status">{tAuth('resetPassword.successMessage')}</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="inner-page">
      <section className="page-hero">
        <div className="page-hero-content">
          <h1>{tAuth('resetPassword.heading')}</h1>
          <p>{tAuth('resetPassword.subheading')}</p>
        </div>
      </section>

      <section className="content-section">
        <div className="container">
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div className="apply-form">
              <form onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="new-password">{tAuth('resetPassword.newPasswordLabel')} *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      ref={passwordRef}
                      id="new-password"
                      name="new-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (formError) setFormError(null); }}
                      required
                      minLength={8}
                      aria-invalid={!!formError}
                      aria-describedby="new-password-hint"
                      style={{ paddingRight: '2.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? tAuth('resetPassword.hidePassword') : tAuth('resetPassword.showPassword')}
                      aria-pressed={showPassword}
                      style={{
                        position: 'absolute',
                        right: 0,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-on-surface-variant)',
                        cursor: 'pointer',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        minHeight: 44,
                      }}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <p id="new-password-hint" className="form-hint">
                    {tAuth('resetPassword.passwordHint')}
                  </p>
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">{tAuth('resetPassword.confirmPasswordLabel')} *</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      ref={confirmRef}
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); if (formError) setFormError(null); }}
                      required
                      aria-invalid={!!formError}
                      aria-describedby={formError ? 'reset-password-error' : undefined}
                      style={{ paddingRight: '2.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? tAuth('resetPassword.hidePassword') : tAuth('resetPassword.showPassword')}
                      aria-pressed={showConfirm}
                      style={{
                        position: 'absolute',
                        right: 0,
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-on-surface-variant)',
                        cursor: 'pointer',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 44,
                        minHeight: 44,
                      }}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>
                        {showConfirm ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                {formError && (
                  <div
                    id="reset-password-error"
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
                  style={{ width: '100%', padding: '1rem', minHeight: 44 }}
                  disabled={stage === 'submitting'}
                  aria-busy={stage === 'submitting'}
                >
                  <span aria-live="polite">{stage === 'submitting' ? tAuth('resetPassword.saving') : tAuth('resetPassword.submit')}</span>
                </button>
                <p style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <LocalizedLink href="/login">{tAuth('resetPassword.backToLogin')}</LocalizedLink>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResetPasswordLoadingFallback() {
  const tAuth = useTranslations('auth');
  return (
    <div className="inner-page" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      {tAuth('resetPassword.loading')}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoadingFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
