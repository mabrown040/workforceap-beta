'use client';

import { useState } from 'react';

type ProfileFormProps = {
  initialUser: { email: string; fullName: string; phone: string | null };
  initialProfile: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;
};

export default function ProfileForm({ initialUser, initialProfile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialUser.fullName);
  const [phone, setPhone] = useState(initialUser.phone ?? '');
  const [address, setAddress] = useState(initialProfile?.address ?? '');
  const [city, setCity] = useState(initialProfile?.city ?? '');
  const [state, setState] = useState(initialProfile?.state ?? '');
  const [zip, setZip] = useState(initialProfile?.zip ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/member/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip: zip.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile updated.' });
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Update failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Update failed. Try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="apply-form">
      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={initialUser.email} disabled className="input-disabled" />
        <p className="form-hint">Email cannot be changed here. Use account settings.</p>
      </div>
      <div className="form-group">
        <label htmlFor="fullName">Full name *</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          disabled={saving}
        />
      </div>
      <div className="form-group">
        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="form-group">
        <label htmlFor="address">Address</label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="city">City</label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="form-group">
          <label htmlFor="state">State</label>
          <input
            id="state"
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="TX"
            disabled={saving}
          />
        </div>
        <div className="form-group">
          <label htmlFor="zip">ZIP</label>
          <input
            id="zip"
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
      {message && (
        <div
          role="alert"
          className={message.type === 'success' ? 'form-success-banner' : 'form-error-banner'}
          style={{
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? '#d1fae5' : '#fff3f5',
            borderLeft: `4px solid ${message.type === 'success' ? 'var(--color-green)' : 'var(--color-accent)'}`,
          }}
        >
          {message.text}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
