'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  initial: { fullName: string; phone: string; title: string };
  /** First visit after accepting an invitation: show the welcome copy. */
  isNew: boolean;
};

export default function CounselorProfileForm({ initial, isNew }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [title, setTitle] = useState(initial.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/counselor/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() || null, title: title.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Could not save your profile.');
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="portal-card portal-card--padded" aria-labelledby="counselor-profile-heading">
      <h2 id="counselor-profile-heading" style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>
        {isNew ? 'Set up your counselor profile' : 'Profile details'}
      </h2>
      {isNew ? (
        <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Welcome. Confirm your name, add a phone number members can reach you at, and a short title
          (for example &ldquo;Community Ambassador, East Austin&rdquo;). You can change these any time.
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: 'var(--color-error)', marginBottom: '0.75rem' }}>
          {error}
        </p>
      ) : null}
      {saved ? (
        <p role="status" style={{ color: 'var(--color-green, #2e7d32)', marginBottom: '0.75rem', fontWeight: 600 }}>
          Profile saved.
        </p>
      ) : null}

      <div className="portal-field">
        <label className="portal-field__label" htmlFor="cp-name">
          Full name
        </label>
        <input
          id="cp-name"
          className="portal-input"
          type="text"
          required
          minLength={2}
          maxLength={200}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div className="portal-field">
        <label className="portal-field__label" htmlFor="cp-phone">
          Phone (members may see this)
        </label>
        <input
          id="cp-phone"
          className="portal-input"
          type="tel"
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(512) 555-0100"
          autoComplete="tel"
        />
      </div>

      <div className="portal-field">
        <label className="portal-field__label" htmlFor="cp-title">
          Title (optional)
        </label>
        <input
          id="cp-title"
          className="portal-input"
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Community Ambassador, East Austin"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={saving} aria-busy={saving}>
        {saving ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
