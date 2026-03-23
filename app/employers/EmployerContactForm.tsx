'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((m) => m.Turnstile), { ssr: false });

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export default function EmployerContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (CAPTCHA_ENABLED && TURNSTILE_SITE_KEY) {
      if (!turnstileToken?.trim()) {
        setErrorMsg('Please complete the security check before sending.');
        return;
      }
    }
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const nameParts = name.split(/\s+/).filter(Boolean);
    const first_name = nameParts[0] || name;
    const last_name = nameParts.slice(1).join(' ') || '(Contact)';
    const company = String(formData.get('company') || '').trim();
    const hiring_needs = String(formData.get('hiring_needs') || '').trim();

    const message = [
      company ? `Company: ${company}` : '',
      '',
      'Hiring Needs:',
      hiring_needs || '(Not specified)',
    ]
      .filter(Boolean)
      .join('\n');

    const data: Record<string, unknown> = {
      first_name,
      last_name,
      email: formData.get('email'),
      phone: formData.get('phone') || '',
      topic: 'Employer / Hiring Inquiry',
      message,
      sms_preferred: false,
    };
    if (CAPTCHA_ENABLED && turnstileToken) {
      data.cf_turnstile_response = turnstileToken;
    }

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
          We&rsquo;ll get back to you within 24–48 hours to discuss your hiring needs.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      {status === 'error' && errorMsg && (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: 'var(--radius-sm)',
            color: '#c00',
            fontSize: '0.9rem',
          }}
        >
          {errorMsg}
        </div>
      )}
      <div className="form-group">
        <label htmlFor="employer-name">Name *</label>
        <input id="employer-name" type="text" name="name" required disabled={status === 'sending'} aria-required="true" />
      </div>
      <div className="form-group">
        <label htmlFor="employer-company">Company *</label>
        <input id="employer-company" type="text" name="company" required disabled={status === 'sending'} aria-required="true" />
      </div>
      <div className="form-group">
        <label htmlFor="employer-email">Email *</label>
        <input id="employer-email" type="email" name="email" required disabled={status === 'sending'} aria-required="true" />
      </div>
      <div className="form-group">
        <label htmlFor="employer-phone">Phone</label>
        <input id="employer-phone" type="tel" name="phone" disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label htmlFor="employer-hiring-needs">Hiring Needs *</label>
        <textarea id="employer-hiring-needs" name="hiring_needs" rows={5} required disabled={status === 'sending'} aria-required="true" placeholder="Tell us about the roles you're hiring for, timeline, and any specific requirements..." />
      </div>
      {CAPTCHA_ENABLED && TURNSTILE_SITE_KEY ? (
        <div className="form-group employer-contact-turnstile">
          <Turnstile
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(t) => setTurnstileToken(t)}
            onExpire={() => setTurnstileToken(null)}
            onError={() => setTurnstileToken(null)}
            options={{ theme: 'light', size: 'normal' }}
          />
        </div>
      ) : null}
      <button
        type="submit"
        className="btn btn-primary"
        style={{ width: '100%', padding: '1rem' }}
        disabled={status === 'sending'}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
      <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-gray-400)', fontSize: '.85rem' }}>
        We respond within 24–48 hours.
      </p>
    </form>
  );
}
