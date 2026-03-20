'use client';

import { useState } from 'react';

export default function EmployerContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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

    const data = {
      first_name,
      last_name,
      email: formData.get('email'),
      phone: formData.get('phone') || '',
      topic: 'Employer / Hiring Inquiry',
      message,
      sms_preferred: false,
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
        <label>Name *</label>
        <input type="text" name="name" required disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label>Company *</label>
        <input type="text" name="company" required disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label>Email *</label>
        <input type="email" name="email" required disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label>Phone</label>
        <input type="tel" name="phone" disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label>Hiring Needs *</label>
        <textarea name="hiring_needs" rows={5} required disabled={status === 'sending'} placeholder="Tell us about the roles you're hiring for, timeline, and any specific requirements..." />
      </div>
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
