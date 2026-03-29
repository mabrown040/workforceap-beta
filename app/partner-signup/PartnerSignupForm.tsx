'use client';

import { useState } from 'react';

const ORG_TYPES = [
  { value: '', label: 'Select…' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'church', label: 'Church / faith organization' },
  { value: 'community_center', label: 'Community center' },
  { value: 'workforce_board', label: 'Workforce board' },
  { value: 'school', label: 'School / college' },
  { value: 'veterans', label: 'Veterans organization' },
  { value: 'other', label: 'Other' },
];

const MONTHLY = [
  { value: '', label: 'Select…' },
  { value: '1-5', label: '1–5' },
  { value: '6-15', label: '6–15' },
  { value: '16-30', label: '16–30' },
  { value: '30+', label: '30+' },
];

export default function PartnerSignupForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const payload = {
      organizationName: String(fd.get('organization_name') || '').trim(),
      contactName: String(fd.get('contact_name') || '').trim(),
      contactEmail: String(fd.get('contact_email') || '').trim(),
      contactPhone: String(fd.get('contact_phone') || '').trim() || null,
      orgType: String(fd.get('org_type') || '').trim(),
      serveArea: String(fd.get('serve_area') || '').trim(),
      expectedMonthly: String(fd.get('expected_monthly') || '').trim(),
      hearAbout: String(fd.get('hear_about') || '').trim() || null,
    };

    setStatus('sending');
    setErrorMsg(null);

    try {
      const res = await fetch('/api/partner/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(typeof data.error === 'string' ? data.error : 'Something went wrong.');
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
        className="partner-signup-success"
        style={{
          padding: '2rem',
          background: 'rgba(74, 155, 79, 0.1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(74, 155, 79, 0.3)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.5rem' }}>Thank you!</p>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
          We&rsquo;ll review your registration and set up your partner portal within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form className="contact-form partner-signup-form" onSubmit={handleSubmit}>
      {status === 'error' && errorMsg ? (
        <div
          style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            background: '#fee',
            borderRadius: 'var(--radius-sm)',
            color: '#c00',
            fontSize: '0.9rem',
          }}
          role="alert"
        >
          {errorMsg}
        </div>
      ) : null}

      <div className="form-group">
        <label htmlFor="ps-org">Organization name *</label>
        <input id="ps-org" name="organization_name" required maxLength={200} disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label htmlFor="ps-contact">Contact name *</label>
        <input id="ps-contact" name="contact_name" required maxLength={200} disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label htmlFor="ps-email">Contact email *</label>
        <input id="ps-email" name="contact_email" type="email" required maxLength={320} disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label htmlFor="ps-phone">Contact phone</label>
        <input id="ps-phone" name="contact_phone" type="tel" maxLength={50} disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label htmlFor="ps-type">Organization type *</label>
        <select id="ps-type" name="org_type" className="form-control" required disabled={status === 'sending'}>
          {ORG_TYPES.map((o) => (
            <option key={o.value || 'x'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="ps-area">City / county you serve *</label>
        <input id="ps-area" name="serve_area" required maxLength={200} disabled={status === 'sending'} />
      </div>
      <div className="form-group">
        <label htmlFor="ps-monthly">Estimated monthly referrals *</label>
        <select id="ps-monthly" name="expected_monthly" className="form-control" required disabled={status === 'sending'}>
          {MONTHLY.map((o) => (
            <option key={o.value || 'x'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="ps-hear">How did you hear about WorkforceAP?</label>
        <textarea id="ps-hear" name="hear_about" rows={3} maxLength={2000} disabled={status === 'sending'} />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={status === 'sending'}>
        {status === 'sending' ? 'Submitting…' : 'Submit registration'}
      </button>
    </form>
  );
}
