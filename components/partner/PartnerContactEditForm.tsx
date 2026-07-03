'use client';

import { useState } from 'react';

export default function PartnerContactEditForm({
  partnerId,
  initialContactName,
  initialContactPhone,
}: {
  partnerId: string;
  initialContactName: string | null;
  initialContactPhone: string | null;
}) {
  const [contactName, setContactName] = useState(initialContactName ?? '');
  const [contactPhone, setContactPhone] = useState(initialContactPhone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/partner/settings/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: contactName.trim() || null,
          contactPhone: contactPhone.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Failed to save.');
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="partnercontacteditform-contact-name-field" style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}>
          Contact name
        </label>
        <input id="partnercontacteditform-contact-name-field"
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          maxLength={200}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--outline-variant)',
            borderRadius: '6px',
            fontSize: '0.9375rem',
          }}
        />
      </div>
      <div className="form-group" style={{ marginBottom: '0.75rem' }}>
        <label htmlFor="partnercontacteditform-contact-phone-field" style={{ display: 'block', fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}>
          Contact phone
        </label>
        <input id="partnercontacteditform-contact-phone-field"
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          maxLength={50}
          disabled={saving}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--outline-variant)',
            borderRadius: '6px',
            fontSize: '0.9375rem',
          }}
        />
      </div>
      {error && (
        <div style={{ padding: '0.5rem', marginBottom: '0.75rem', background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', borderRadius: '6px', color: 'var(--color-accent)', fontSize: '0.85rem' }} role="alert">
          {error}
        </div>
      )}
      {saved && (
        <div
          role="status"
          style={{ padding: '0.5rem', marginBottom: '0.75rem', background: 'color-mix(in srgb, var(--color-green) 12%, transparent)', borderRadius: '6px', color: 'var(--color-green)', fontSize: '0.85rem' }}
        >
          Saved successfully.
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="btn btn-primary btn-sm"
        style={{ minWidth: 100 }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
