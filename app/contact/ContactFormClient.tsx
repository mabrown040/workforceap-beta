'use client';

import { useId, useState } from 'react';

export default function ContactFormClient() {
  const formId = useId();
  const errorId = `${formId}-error`;
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

    setStatus('sending');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

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

  const showError = status === 'error' && errorMsg;
  const invalid = status === 'error';

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      {showError && (
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
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { setStatus('idle'); setErrorMsg(null); }}>
            Try again
          </button>
        </div>
      )}
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label htmlFor={`${formId}-first_name`}>First Name *</label>
          <input
            id={`${formId}-first_name`}
            type="text"
            name="first_name"
            required
            disabled={status === 'sending'}
            aria-invalid={invalid}
            aria-describedby={showError ? errorId : undefined}
            autoComplete="given-name"
          />
        </div>
        <div className="form-group">
          <label htmlFor={`${formId}-last_name`}>Last Name *</label>
          <input
            id={`${formId}-last_name`}
            type="text"
            name="last_name"
            required
            disabled={status === 'sending'}
            aria-invalid={invalid}
            aria-describedby={showError ? errorId : undefined}
            autoComplete="family-name"
          />
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
          aria-invalid={invalid}
          aria-describedby={showError ? errorId : undefined}
          autoComplete="email"
        />
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
          aria-invalid={invalid}
          aria-describedby={showError ? errorId : undefined}
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
      </div>
      <div className="form-group">
        <label htmlFor={`${formId}-message`}>Your Message *</label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={5}
          required
          disabled={status === 'sending'}
          aria-invalid={invalid}
          aria-describedby={showError ? errorId : undefined}
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '1rem' }}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
        <p className="contact-form-footnote">
        We respond within 24–48 hours.
      </p>
    </form>
  );
}
