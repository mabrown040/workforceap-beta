'use client';

import { useEffect, useId, useState } from 'react';
import { trackLeadFormEvent } from '@/lib/analytics/events';
import { useTranslations } from 'next-intl';
import { marketingButtonPresets, marketingSecondaryButtonClasses } from '@/lib/marketing/buttonClasses';

type FieldKey = 'first_name' | 'last_name' | 'email' | 'topic' | 'message';

function getPrefilledTopic(topicParam: string | null): string {
  const topic = topicParam?.trim().toLowerCase();
  if (!topic) return '';

  const topicMap: Record<string, string> = {
    partnership: 'Partnership or sponsorship',
    partnerships: 'Partnership or sponsorship',
    sponsorship: 'Partnership or sponsorship',
    sponsor: 'Partnership or sponsorship',
    program: 'Program information',
    eligibility: 'Eligibility or no-cost member training',
    application: 'Application help',
    tour: 'Schedule a tour',
    media: 'Media or press inquiry',
    press: 'Media or press inquiry',
    accessibility: 'Accessibility issue',
    a11y: 'Accessibility issue',
    other: 'Other',
  };

  return topicMap[topic] ?? '';
}

function validateContactFields(data: {
  first_name: unknown;
  last_name: unknown;
  email: unknown;
  topic: unknown;
  message: unknown;
}): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  const first = typeof data.first_name === 'string' ? data.first_name.trim() : '';
  const last = typeof data.last_name === 'string' ? data.last_name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  if (!first) errors.first_name = 'Enter your first name.';
  if (!last) errors.last_name = 'Enter your last name.';
  if (!email) {
    errors.email = 'Enter your email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (!topic) errors.topic = 'Choose a topic so we can route your message.';
  if (!message) {
    errors.message = 'Enter a message.';
  } else if (message.length < 10) {
    errors.message = 'Please add a bit more detail (at least 10 characters).';
  }

  return errors;
}

export default function ContactFormClient({ initialTopic = '' }: { initialTopic?: string }) {
  const tForm = useTranslations('form');
  const tMessages = useTranslations('messages');
  const tCommon = useTranslations('common');
  const formId = useId();
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);

  useEffect(() => {
    trackLeadFormEvent('contact', 'viewed');
  }, []);

  const errorId = `${formId}-error`;
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone') || '',
      topic: formData.get('topic'),
      message: formData.get('message'),
      sms_preferred: formData.get('sms_preferred') === 'true',
    };

    const clientErrors = validateContactFields(data);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setStatus('idle');
      setErrorMsg(null);
      return;
    }
    setFieldErrors({});

    setStatus('sending');
    setErrorMsg(null);
    trackLeadFormEvent('contact', 'submitted', { topic: typeof data.topic === 'string' ? data.topic : undefined });

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      let json: { error?: string } = {};
      try {
        json = (await res.json()) as { error?: string };
      } catch {
        /* non-JSON body */
      }

      if (res.status === 429) {
        setStatus('error');
        trackLeadFormEvent('contact', 'errored', { reason: 'rate_limited' });
        setErrorMsg(
          json.error ??
            'You have reached the submission limit for now. Please wait about an hour before sending another message — your earlier requests are still on file.'
        );
        return;
      }

      if (!res.ok) {
        setStatus('error');
        trackLeadFormEvent('contact', 'errored', { reason: json.error ?? 'request_failed' });
        setErrorMsg(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      trackLeadFormEvent('contact', 'succeeded', { topic: typeof data.topic === 'string' ? data.topic : undefined });
      form.reset();
      setSelectedTopic(initialTopic);
    } catch {
      setStatus('error');
      trackLeadFormEvent('contact', 'errored', { reason: 'network_error' });
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div role="status" aria-live="polite" className="contact-form-success">
        <p className="contact-form-success-title">Message sent successfully</p>
        <p className="contact-form-success-body">
          A WorkforceAP team member will get back to you within 1–2 business days.
        </p>
      </div>
    );
  }

  const showFormError = status === 'error' && errorMsg;
  const hasFieldError = (k: FieldKey) => Boolean(fieldErrors[k]);

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {showFormError && (
        <div id={errorId} role="alert" aria-live="assertive" className="contact-form-error">
          <p>{errorMsg}</p>
          <button
            type="button"
            className={marketingSecondaryButtonClasses({ radius: 'sm' })}
            onClick={() => {
              setStatus('idle');
              setErrorMsg(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="form-row contact-form-name-row">
        <div className="form-group">
          <label htmlFor={`${formId}-first_name`}>{tForm('firstNameRequired')}</label>
          <input
            id={`${formId}-first_name`}
            type="text"
            name="first_name"
            required
            disabled={status === 'sending'}
            aria-invalid={hasFieldError('first_name')}
            aria-describedby={
              [hasFieldError('first_name') ? `${formId}-err-first_name` : '', showFormError ? errorId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            autoComplete="given-name"
            onChange={() => setFieldErrors((p) => ({ ...p, first_name: undefined }))}
          />
          {fieldErrors.first_name && (
            <p id={`${formId}-err-first_name`} className="contact-form-field-error" role="alert">
              {fieldErrors.first_name}
            </p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor={`${formId}-last_name`}>{tForm('lastNameRequired')}</label>
          <input
            id={`${formId}-last_name`}
            type="text"
            name="last_name"
            required
            disabled={status === 'sending'}
            aria-invalid={hasFieldError('last_name')}
            aria-describedby={
              [hasFieldError('last_name') ? `${formId}-err-last_name` : '', showFormError ? errorId : '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            autoComplete="family-name"
            onChange={() => setFieldErrors((p) => ({ ...p, last_name: undefined }))}
          />
          {fieldErrors.last_name && (
            <p id={`${formId}-err-last_name`} className="contact-form-field-error" role="alert">
              {fieldErrors.last_name}
            </p>
          )}
        </div>
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-email`}>{tForm('emailRequired')}</label>
        <input
          id={`${formId}-email`}
          type="email"
          name="email"
          required
          disabled={status === 'sending'}
          aria-invalid={hasFieldError('email')}
          aria-describedby={
            [hasFieldError('email') ? `${formId}-err-email` : '', showFormError ? errorId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          autoComplete="email"
          onChange={() => setFieldErrors((p) => ({ ...p, email: undefined }))}
        />
        {fieldErrors.email && (
          <p id={`${formId}-err-email`} className="contact-form-field-error" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-phone`}>{tForm('phoneNumber')}</label>
        <input
          id={`${formId}-phone`}
          type="tel"
          name="phone"
          disabled={status === 'sending'}
          autoComplete="tel"
        />
      </div>
      <div className="form-group contact-form-checkbox-row">
        <label htmlFor={`${formId}-sms`} className="contact-checkbox-label">
          <input
            id={`${formId}-sms`}
            className="contact-checkbox-input"
            type="checkbox"
            name="sms_preferred"
            value="true"
            disabled={status === 'sending'}
          />
          <span>I&rsquo;d prefer to be contacted by text message</span>
        </label>
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-topic`}>
          What can we help with? <span aria-hidden="true">*</span>
        </label>
        <select
          id={`${formId}-topic`}
          name="topic"
          value={selectedTopic}
          required
          disabled={status === 'sending'}
          aria-required="true"
          aria-invalid={hasFieldError('topic')}
          aria-describedby={
            [hasFieldError('topic') ? `${formId}-err-topic` : '', showFormError ? errorId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={(e) => {
            setSelectedTopic(e.target.value);
            setFieldErrors((p) => ({ ...p, topic: undefined }));
          }}
        >
          <option value="">Select a topic&hellip;</option>
          <option>Program information</option>
          <option>Eligibility or no-cost member training</option>
          <option>Application help</option>
          <option>Schedule a tour</option>
          <option>Partnership or sponsorship</option>
          <option>Media or press inquiry</option>
          <option>Accessibility issue</option>
          <option>Other</option>
        </select>
        {fieldErrors.topic && (
          <p id={`${formId}-err-topic`} className="contact-form-field-error" role="alert">
            {fieldErrors.topic}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-message`}>{tMessages('yourMessageRequired')}</label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={5}
          required
          disabled={status === 'sending'}
          aria-invalid={hasFieldError('message')}
          aria-describedby={
            [hasFieldError('message') ? `${formId}-err-message` : '', showFormError ? errorId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={() => setFieldErrors((p) => ({ ...p, message: undefined }))}
        />
        {fieldErrors.message && (
          <p id={`${formId}-err-message`} className="contact-form-field-error" role="alert">
            {fieldErrors.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        className={marketingButtonPresets.formSubmitPrimary('btn-full-width')}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? tCommon('sending') : tMessages('sendMessage')}
      </button>
      <p className="contact-form-footnote">A WorkforceAP team member responds within 1–2 business days.</p>
    </form>
  );
}
