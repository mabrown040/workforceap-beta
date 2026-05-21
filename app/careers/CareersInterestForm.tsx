'use client';

import { useEffect, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { trackLeadFormEvent } from '@/lib/analytics/events';
import { useTranslations } from 'next-intl';
import { marketingButtonPresets } from '@/lib/marketing/buttonClasses';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((m) => m.Turnstile), { ssr: false });

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

type FieldKey = 'first_name' | 'last_name' | 'email' | 'interest_area' | 'message';

const INTEREST_AREAS = [
  { value: '', labelKey: 'interestSelect' as const },
  { value: 'counselor', labelKey: 'interestCounselor' as const },
  { value: 'engineering', labelKey: 'interestEngineering' as const },
  { value: 'operations', labelKey: 'interestOperations' as const },
  { value: 'other', labelKey: 'interestOther' as const },
];

function validateFields(data: {
  first_name: unknown;
  last_name: unknown;
  email: unknown;
  message: unknown;
}): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const first = typeof data.first_name === 'string' ? data.first_name.trim() : '';
  const last = typeof data.last_name === 'string' ? data.last_name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  if (!first) errors.first_name = 'Enter your first name.';
  if (!last) errors.last_name = 'Enter your last name.';
  if (!email) {
    errors.email = 'Enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!message) {
    errors.message = 'Tell us a bit about your background and interests.';
  } else if (message.length < 20) {
    errors.message = 'Please add a bit more detail (at least 20 characters).';
  }

  return errors;
}

export default function CareersInterestForm() {
  const t = useTranslations('marketing.careers.form');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const formId = useId();
  const errorId = `${formId}-error`;

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    trackLeadFormEvent('careers', 'viewed');
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      first_name: fd.get('first_name'),
      last_name: fd.get('last_name'),
      email: fd.get('email'),
      interest_area: fd.get('interest_area'),
      message: fd.get('message'),
      cf_turnstile_response: turnstileToken,
    };

    const errors = validateFields(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setStatus('error');
      setErrorMsg(t('validationSummary'));
      trackLeadFormEvent('careers', 'errored', { reason: 'validation' });
      return;
    }

    setFieldErrors({});
    trackLeadFormEvent('careers', 'submitted');

    try {
      const res = await fetch('/api/leads/careers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || t('submitError'));
      }

      setStatus('success');
      form.reset();
      setTurnstileToken(null);
      trackLeadFormEvent('careers', 'succeeded');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : t('submitError'));
      trackLeadFormEvent('careers', 'errored', { reason: 'network' });
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        style={{
          padding: '1.5rem',
          borderRadius: '0.875rem',
          background: 'rgba(46, 125, 50, 0.12)',
          border: '1px solid rgba(46, 125, 50, 0.35)',
          color: 'var(--color-on-surface)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>{t('successTitle')}</p>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--color-on-surface-variant)' }}>{t('successBody')}</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid var(--outline-variant, #584144)',
    background: 'var(--surface-container-lowest, #fff)',
    color: 'var(--color-on-surface)',
    fontSize: '1rem',
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={errorMsg ? errorId : undefined}>
      {errorMsg && (
        <div
          id={errorId}
          role="alert"
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: 'rgba(173, 44, 77, 0.12)',
            color: 'var(--color-on-surface)',
            fontSize: '0.875rem',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div>
          <label htmlFor={`${formId}-first`} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            {tForm('firstName')} <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-first`}
            name="first_name"
            type="text"
            autoComplete="given-name"
            required
            style={inputStyle}
            aria-invalid={fieldErrors.first_name ? 'true' : undefined}
          />
          {fieldErrors.first_name && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-accent)' }}>{fieldErrors.first_name}</p>
          )}
        </div>
        <div>
          <label htmlFor={`${formId}-last`} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
            {tForm('lastName')} <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-last`}
            name="last_name"
            type="text"
            autoComplete="family-name"
            required
            style={inputStyle}
            aria-invalid={fieldErrors.last_name ? 'true' : undefined}
          />
          {fieldErrors.last_name && (
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-accent)' }}>{fieldErrors.last_name}</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label htmlFor={`${formId}-email`} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          {tForm('email')} <span aria-hidden="true">*</span>
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          style={inputStyle}
          aria-invalid={fieldErrors.email ? 'true' : undefined}
        />
        {fieldErrors.email && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-accent)' }}>{fieldErrors.email}</p>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label htmlFor={`${formId}-interest`} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          {t('interestLabel')}
        </label>
        <select id={`${formId}-interest`} name="interest_area" defaultValue="" style={inputStyle}>
          {INTEREST_AREAS.map(({ value, labelKey }) => (
            <option key={value || 'empty'} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label htmlFor={`${formId}-message`} style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
          {t('messageLabel')} <span aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={5}
          required
          style={{ ...inputStyle, resize: 'vertical' }}
          aria-invalid={fieldErrors.message ? 'true' : undefined}
          placeholder={t('messagePlaceholder')}
        />
        {fieldErrors.message && (
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--color-accent)' }}>{fieldErrors.message}</p>
        )}
      </div>

      {CAPTCHA_ENABLED && TURNSTILE_SITE_KEY && (
        <div style={{ marginTop: '1rem' }}>
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className={marketingButtonPresets.heroPrimary()}
        style={{ marginTop: '1.25rem', width: '100%' }}
      >
        {status === 'sending' ? tCommon('sending') : t('submit')}
      </button>
    </form>
  );
}
