'use client';

import { useId, useState } from 'react';

type FieldKey = 'first_name' | 'last_name' | 'email' | 'topic' | 'message';

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

export default function ContactFormClient() {
  const formId = useId();
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
        setErrorMsg(
          json.error ??
            'You have reached the submission limit for now. Please wait about an hour before sending another message — your earlier requests are still on file.'
        );
        return;
      }

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(json.error ?? 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      form.reset();
    } catch {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          padding: '2rem',
          background: 'rgba(74, 155, 79, 0.1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(74, 155, 79, 0.3)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>
          Message sent successfully
        </p>
        <p style={{ color: 'var(--color-gray-600)' }}>
          We&rsquo;ll get back to you within 24–48 hours.
        </p>
      </div>
    );
  }

  const showFormError = status === 'error' && errorMsg;
  const hasFieldError = (k: FieldKey) => Boolean(fieldErrors[k]);

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {showFormError && (
        <div
          id={errorId}
          role="alert"
          aria-live="assertive"
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: 'var(--radius-sm)',
            color: '#c00',
            fontSize: '0.9rem',
          }}
        >
          <p style={{ margin: '0 0 0.75rem' }}>{errorMsg}</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
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
          <label htmlFor={`${formId}-first_name`}>First Name *</label>
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
          <label htmlFor={`${formId}-last_name`}>Last Name *</label>
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
        <label htmlFor={`${formId}-email`}>Email Address *</label>
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
        <label htmlFor={`${formId}-phone`}>Phone Number</label>
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
          <span>I&apos;d prefer to be contacted by text message</span>
        </label>
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-topic`}>
          What can we help with? <span aria-hidden="true">*</span>
        </label>
        <select
          id={`${formId}-topic`}
          name="topic"
          required
          disabled={status === 'sending'}
          aria-required="true"
          aria-invalid={hasFieldError('topic')}
          aria-describedby={
            [hasFieldError('topic') ? `${formId}-err-topic` : '', showFormError ? errorId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={() => setFieldErrors((p) => ({ ...p, topic: undefined }))}
        >
          <option value="">Select a topic&hellip;</option>
          <option>Program information</option>
          <option>Eligibility questions</option>
          <option>Application help</option>
          <option>Schedule a tour</option>
          <option>Partnership or sponsorship</option>
          <option>Media or press inquiry</option>
          <option>Other</option>
        </select>
        {fieldErrors.topic && (
          <p id={`${formId}-err-topic`} className="contact-form-field-error" role="alert">
            {fieldErrors.topic}
          </p>
        )}
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-message`}>Your Message *</label>
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
        className="btn btn-primary"
        style={{ width: '100%', padding: '1rem' }}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
      <p className="contact-form-footnote">We respond within 24–48 hours.</p>
    </form>
  );
}
