'use client';

import { useEffect, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { trackLeadFormEvent } from '@/lib/analytics/events';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  type CareersLeadErrorCode,
  type CareersLeadFieldKey,
  validateCareersLeadPayload,
} from '@/lib/validation/careersLead';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((m) => m.Turnstile), { ssr: false });

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const INTEREST_AREAS = [
  { value: '', labelKey: 'interestSelect' as const },
  { value: 'counselor', labelKey: 'interestCounselor' as const },
  { value: 'engineering', labelKey: 'interestEngineering' as const },
  { value: 'operations', labelKey: 'interestOperations' as const },
  { value: 'other', labelKey: 'interestOther' as const },
];

export default function CareersInterestForm() {
  const t = useTranslations('marketing.careers.form');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const formId = useId();
  const errorId = `${formId}-error`;
  const roleTitle = searchParams?.get('role')?.trim() || '';

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<CareersLeadFieldKey, CareersLeadErrorCode>>>({});
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
      role_title: roleTitle,
      cf_turnstile_response: turnstileToken,
    };

    const validation = validateCareersLeadPayload(payload);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
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
      <div role="status" className="wa-form-success">
        <p className="wa-form-success-title">{t('successTitle')}</p>
        <p className="wa-form-success-body">{t('successBody')}</p>
      </div>
    );
  }

  function getFieldErrorMessage(field: CareersLeadFieldKey, code: CareersLeadErrorCode): string {
    switch (field) {
      case 'first_name':
        return t('errors.firstNameRequired');
      case 'last_name':
        return t('errors.lastNameRequired');
      case 'email':
        return t(code === 'required' ? 'errors.emailRequired' : 'errors.emailInvalid');
      case 'message':
        return t(code === 'required' ? 'errors.messageRequired' : 'errors.messageTooShort');
      default:
        return t('validationSummary');
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-describedby={errorMsg ? errorId : undefined}>
      {roleTitle ? (
        <div role="status" className="wa-form-applying">
          <strong>{t('applyingForLabel')}</strong> {roleTitle}
        </div>
      ) : null}

      {errorMsg && (
        <div id={errorId} role="alert" className="wa-form-alert">
          {errorMsg}
        </div>
      )}

      <div className="wa-frow">
        <div className="wa-field">
          <label htmlFor={`${formId}-first`}>
            {tForm('firstName')} <span className="wa-req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-first`}
            name="first_name"
            type="text"
            autoComplete="given-name"
            required
            aria-invalid={fieldErrors.first_name ? 'true' : undefined}
          />
          {fieldErrors.first_name && (
            <p className="wa-field-error">{getFieldErrorMessage('first_name', fieldErrors.first_name)}</p>
          )}
        </div>
        <div className="wa-field">
          <label htmlFor={`${formId}-last`}>
            {tForm('lastName')} <span className="wa-req" aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-last`}
            name="last_name"
            type="text"
            autoComplete="family-name"
            required
            aria-invalid={fieldErrors.last_name ? 'true' : undefined}
          />
          {fieldErrors.last_name && (
            <p className="wa-field-error">{getFieldErrorMessage('last_name', fieldErrors.last_name)}</p>
          )}
        </div>
      </div>

      <div className="wa-field">
        <label htmlFor={`${formId}-email`}>
          {tForm('email')} <span className="wa-req" aria-hidden="true">*</span>
        </label>
        <input
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={fieldErrors.email ? 'true' : undefined}
        />
        {fieldErrors.email && (
          <p className="wa-field-error">{getFieldErrorMessage('email', fieldErrors.email)}</p>
        )}
      </div>

      <div className="wa-field">
        <label htmlFor={`${formId}-interest`}>{t('interestLabel')}</label>
        <select id={`${formId}-interest`} name="interest_area" defaultValue="">
          {INTEREST_AREAS.map(({ value, labelKey }) => (
            <option key={value || 'empty'} value={value}>
              {t(labelKey)}
            </option>
          ))}
        </select>
      </div>

      <div className="wa-field">
        <label htmlFor={`${formId}-message`}>
          {t('messageLabel')} <span className="wa-req" aria-hidden="true">*</span>
        </label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={5}
          required
          aria-invalid={fieldErrors.message ? 'true' : undefined}
          placeholder={t('messagePlaceholder')}
        />
        {fieldErrors.message && (
          <p className="wa-field-error">{getFieldErrorMessage('message', fieldErrors.message)}</p>
        )}
      </div>

      {CAPTCHA_ENABLED && TURNSTILE_SITE_KEY && (
        <div className="wa-field">
          <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken(null)} />
        </div>
      )}

      <button type="submit" disabled={status === 'sending'} className="wa-btn wa-btn--primary">
        {status === 'sending' ? tCommon('sending') : t('submit')}
      </button>
    </form>
  );
}
