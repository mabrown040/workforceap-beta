'use client';

import { useState, useCallback } from 'react';

type Prefs = {
  notifyOnEnrollment: boolean;
  notifyOnCourse: boolean;
  notifyOnCertified: boolean;
  notifyOnPlaced: boolean;
};

const PREF_LABELS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: 'notifyOnEnrollment', label: 'New enrollment', desc: 'When a referred member enrolls in a program' },
  { key: 'notifyOnCourse', label: 'Course milestones', desc: 'When a member completes a course' },
  { key: 'notifyOnCertified', label: 'Certification earned', desc: 'When a member earns a certificate' },
  { key: 'notifyOnPlaced', label: 'Job placement', desc: 'When a member is placed in a role' },
];

export default function PartnerNotificationPrefs({ initial }: { initial: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saving, setSaving] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const toggle = useCallback(async (key: keyof Prefs, label: string) => {
    const next = !prefs[key];
    setSaving(key);
    try {
      const res = await fetch('/api/partner/settings/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next }),
      });
      if (res.ok) {
        setPrefs((p) => ({ ...p, [key]: next }));
        setAnnouncement(`${label} notifications turned ${next ? 'on' : 'off'}.`);
      } else {
        setAnnouncement(`Could not update ${label} notifications. Please try again.`);
      }
    } catch {
      setAnnouncement(`Could not update ${label} notifications. Please try again.`);
    } finally {
      setSaving(null);
    }
  }, [prefs]);

  return (
    <div className="portal-card portal-card--flat" style={{ padding: '1.25rem', maxWidth: 640, marginBottom: '1.25rem' }}>
      <h2 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>Email notifications</h2>
      <p aria-live="polite" className="wa-sr-only">{announcement}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {PREF_LABELS.map(({ key, label, desc }) => (
          <label
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '0.5rem 0',
              borderBottom: '1px solid var(--outline-variant)',
              cursor: 'pointer',
              opacity: saving === key ? 0.6 : 1,
            }}
          >
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-on-surface)', display: 'block' }}>
                {label}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                {desc}
              </span>
            </div>
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={() => toggle(key, label)}
              disabled={saving !== null}
              style={{ width: 20, height: 20, accentColor: 'var(--color-accent)', cursor: 'pointer', flexShrink: 0 }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
