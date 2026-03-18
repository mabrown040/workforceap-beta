'use client';

import { useState } from 'react';

export default function ContactFormClient() {
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
          We&rsquo;ll get back to you within 24 hours.
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
      <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label>First Name *</label>
          <input type="text" name="first_name" required disabled={status === 'sending'} />
        </div>
        <div className="form-group">
          <label>Last Name *</label>
          <input type="text" name="last_name" required disabled={status === 'sending'} />
        </div>
      </div>
      <div className="form-group">
        <label>Email Address *</label>
        <input type="email" name="email" required disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label>Phone Number</label>
        <input type="tel" name="phone" disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label>What can we help with? *</label>
        <select name="topic" required disabled={status === 'sending'}>
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
        <label>Your Message *</label>
        <textarea name="message" rows={5} required disabled={status === 'sending'} />
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
        We respond within 24 hours.
      </p>
    </form>
  );
}
