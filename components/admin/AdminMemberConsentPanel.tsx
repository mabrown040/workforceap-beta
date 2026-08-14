'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type ConsentProfile = {
  isMinor: boolean;
  parentGuardianName: string | null;
  parentGuardianEmail: string | null;
  parentGuardianPhone: string | null;
  parentalConsentGiven: boolean;
  parentalConsentDate: string | null;
  schoolName: string | null;
  gradeLevel: string | null;
};

export default function AdminMemberConsentPanel({
  memberId,
  profile,
}: {
  memberId: string;
  profile: ConsentProfile;
}) {
  const router = useRouter();
  const [isMinor, setIsMinor] = useState(profile.isMinor);
  const [parentGuardianName, setParentGuardianName] = useState(profile.parentGuardianName ?? '');
  const [parentGuardianEmail, setParentGuardianEmail] = useState(profile.parentGuardianEmail ?? '');
  const [parentGuardianPhone, setParentGuardianPhone] = useState(profile.parentGuardianPhone ?? '');
  const [parentalConsentGiven, setParentalConsentGiven] = useState(profile.parentalConsentGiven);
  const [schoolName, setSchoolName] = useState(profile.schoolName ?? '');
  const [gradeLevel, setGradeLevel] = useState(profile.gradeLevel ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/members/${memberId}/consent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isMinor,
          parentGuardianName: parentGuardianName.trim() || null,
          parentGuardianEmail: parentGuardianEmail.trim() || null,
          parentGuardianPhone: parentGuardianPhone.trim() || null,
          parentalConsentGiven,
          schoolName: schoolName.trim() || null,
          gradeLevel: gradeLevel.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Save failed');
      setMessage('Consent record saved.');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function copyGuardianLink() {
    setLinkMessage(null);
    try {
      const res = await fetch('/api/admin/token-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectUserId: memberId,
          type: 'guardian_consent',
          email: parentGuardianEmail.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not generate a link');
      try {
        await navigator.clipboard?.writeText(data.url);
        setLinkMessage(`Guardian consent link copied: ${data.url}`);
      } catch {
        setLinkMessage(`Guardian consent link: ${data.url}`);
      }
    } catch (e) {
      setLinkMessage(e instanceof Error ? e.message : 'Could not generate a link');
    }
  }

  return (
    <section style={{ padding: '1rem', background: 'var(--color-light)', borderRadius: 'var(--radius-md)' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Minor / guardian consent</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
        Consent gates Coursera seat activation, never signup. Record a school packet here or send a tokenized guardian link.
      </p>
      {profile.parentalConsentDate ? (
        <p style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Last recorded: {new Date(profile.parentalConsentDate).toLocaleDateString()}
        </p>
      ) : null}
      <div style={{ display: 'grid', gap: '0.6rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} />
          Student is under 18
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={parentalConsentGiven}
            onChange={(e) => setParentalConsentGiven(e.target.checked)}
          />
          Parental / guardian consent on file
        </label>
        <input
          placeholder="School name"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          style={{ padding: '0.45rem 0.6rem' }}
        />
        <input
          placeholder="Grade level"
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          style={{ padding: '0.45rem 0.6rem' }}
        />
        <input
          placeholder="Guardian name"
          value={parentGuardianName}
          onChange={(e) => setParentGuardianName(e.target.value)}
          style={{ padding: '0.45rem 0.6rem' }}
        />
        <input
          placeholder="Guardian email"
          type="email"
          value={parentGuardianEmail}
          onChange={(e) => setParentGuardianEmail(e.target.value)}
          style={{ padding: '0.45rem 0.6rem' }}
        />
        <input
          placeholder="Guardian phone"
          value={parentGuardianPhone}
          onChange={(e) => setParentGuardianPhone(e.target.value)}
          style={{ padding: '0.45rem 0.6rem' }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save consent'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => void copyGuardianLink()}>
          Copy guardian consent link
        </button>
      </div>
      {message ? <p role="status" style={{ marginTop: 8, fontSize: '0.85rem' }}>{message}</p> : null}
      {linkMessage ? <p role="status" style={{ marginTop: 8, fontSize: '0.85rem' }}>{linkMessage}</p> : null}
    </section>
  );
}
