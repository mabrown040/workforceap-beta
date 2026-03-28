'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

const Turnstile = dynamic(() => import('@marsidev/react-turnstile').then((m) => m.Turnstile), { ssr: false });

const CAPTCHA_ENABLED = process.env.NEXT_PUBLIC_CAPTCHA_ENABLED === 'true';
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

const HIRE_VOLUME = [
  { value: '', label: 'Select…' },
  { value: '1-2', label: '1–2' },
  { value: '3-5', label: '3–5' },
  { value: '6-10', label: '6–10' },
  { value: '10+', label: '10+' },
];

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
    const contactName = String(formData.get('contact_name') || '').trim();
    const nameParts = contactName.split(/\s+/).filter(Boolean);
    const first_name = nameParts[0] || contactName;
    const last_name = nameParts.slice(1).join(' ') || '(Contact)';
    const company = String(formData.get('company') || '').trim();
    const roleTitle = String(formData.get('role_title') || '').trim();
    const rolesHiring = String(formData.get('roles_hiring') || '').trim();
    const hireVolume = String(formData.get('hire_volume') || '').trim();

    const message = [
      company ? `Company: ${company}` : '',
      roleTitle ? `Role / title: ${roleTitle}` : '',
      '',
      'What roles are you hiring for?',
      rolesHiring || '(Not specified)',
      '',
      'Hires in the next 6 months (estimate):',
      hireVolume || '(Not specified)',
    ]
      .filter(Boolean)
      .join('\n');

    const data: Record<string, unknown> = {
      first_name,
      last_name,
      email: formData.get('email'),
      phone: formData.get('phone') || '',
      topic: 'Employer Inquiry',
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
          Thank you — we received your inquiry
        </p>
        <p style={{ color: 'var(--color-gray-600)' }}>
          We&rsquo;ll reach out within 24–48 hours.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form employer-contact-form" onSubmit={handleSubmit} id="employer-contact-form">
      {status === 'error' && errorMsg && (
        <div
          className="form-error-box"
        >
          {errorMsg}
        </div>
      )}
      <div className="form-group">
        <label htmlFor="employer-company">Company name *</label>
        <input id="employer-company" type="text" name="company" required disabled={status === 'sending'} aria-required="true" />
      </div>
      <div className="form-group">
        <label htmlFor="employer-contact-name">Contact name *</label>
        <input id="employer-contact-name" type="text" name="contact_name" required disabled={status === 'sending'} aria-required="true" />
      </div>
      <div className="form-group">
        <label htmlFor="employer-role-title">Role / title</label>
        <input id="employer-role-title" type="text" name="role_title" disabled={status === 'sending'} placeholder="e.g. Director of Talent" />
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
        <label htmlFor="employer-roles-hiring">What roles are you hiring for? *</label>
        <textarea
          id="employer-roles-hiring"
          name="roles_hiring"
          rows={4}
          required
          disabled={status === 'sending'}
          aria-required="true"
          placeholder="Titles, locations, full-time or contract, timeline…"
        />
      </div>
      <div className="form-group">
        <label htmlFor="employer-hire-volume">How many hires are you looking for in the next 6 months? *</label>
        <select id="employer-hire-volume" name="hire_volume" className="form-control" required disabled={status === 'sending'} aria-required="true">
          {HIRE_VOLUME.map((o) => (
            <option key={o.value || 'empty'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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
        {status === 'sending' ? 'Sending…' : 'Submit inquiry'}
      </button>
      <p style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--color-gray-400)', fontSize: '.85rem' }}>
        We respond within 24–48 hours.
      </p>
    </form>
  );
}
