'use client';

import { useState } from 'react';
import { DesignSurface, Avatar, FormField, Toggle } from '@/components/portal/kit';

/**
 * Member Portal — PROFILE view (account details + notification prefs).
 * Faithful port of `data-view-panel="profile"` in
 * docs/mockups/workforceap-member-suite.html.
 *
 * Interactive (form fields + toggles) → 'use client'.
 *
 * Target route: app/(portal)/dashboard/profile
 * Surface: warm (member-facing).
 */

interface ProfileBadge {
  label: string;
  bg: string;
  color: string;
}

interface NotificationPref {
  key: string;
  label: string;
  enabled: boolean;
}

export interface MemberProfileKitProps {
  name?: string;
  initials?: string;
  headline?: string;
  badges?: ProfileBadge[];
  email?: string;
  location?: string;
  programInterest?: string;
  programOptions?: string[];
  notifications?: NotificationPref[];
}

const DEFAULT_BADGES: ProfileBadge[] = [
  { label: '2 Certs', bg: 'var(--wa-gold-soft, #FEF3C7)', color: 'var(--wa-gold)' },
  { label: '84 Readiness', bg: '#ecfdf3', color: 'var(--wa-success)' },
  { label: '12-day streak', bg: 'var(--wa-accent-soft)', color: 'var(--wa-accent)' },
];

const DEFAULT_PROGRAM_OPTIONS = ['Cloud & IT', 'Data & AI', 'Healthcare', 'Skilled Trades'];

const DEFAULT_NOTIFICATIONS: NotificationPref[] = [
  { key: 'jobs', label: 'Job matches', enabled: true },
  { key: 'counselor', label: 'Counselor messages', enabled: true },
  { key: 'reminders', label: 'Course reminders', enabled: false },
  { key: 'recap', label: 'Weekly recap email', enabled: true },
];

export function MemberProfileKit({
  name = 'Mike Brown',
  initials = 'MB',
  headline = 'AWS Cloud Practitioner candidate · Austin, TX',
  badges = DEFAULT_BADGES,
  email = 'mike.brown@email.com',
  location = 'Austin, TX',
  programInterest = 'Cloud & IT',
  programOptions = DEFAULT_PROGRAM_OPTIONS,
  notifications = DEFAULT_NOTIFICATIONS,
}: MemberProfileKitProps) {
  const [prefs, setPrefs] = useState<NotificationPref[]>(notifications);

  const togglePref = (key: string, value: boolean) =>
    setPrefs((prev) => prev.map((p) => (p.key === key ? { ...p, enabled: value } : p)));

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        {/* Profile header */}
        <div className="wa-kit-card wa-flex wa-flex-col sm:wa-flex-row wa-items-center wa-gap-5">
          <Avatar initials={initials} size={80} gradient />
          <div style={{ flex: 1, textAlign: 'center' }} className="sm:wa-text-left">
            <h2 className="h-font" style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>{name}</h2>
            <p style={{ fontSize: 14, color: 'var(--wa-muted)' }}>{headline}</p>
            <div className="wa-flex wa-flex-wrap wa-gap-2 wa-justify-center sm:wa-justify-start" style={{ marginTop: 12 }}>
              {badges.map((b) => (
                <span
                  key={b.label}
                  style={{ padding: '4px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: b.bg, color: b.color }}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="wa-kit-focus"
            style={{
              padding: '8px 16px',
              border: '1px solid var(--wa-border)',
              background: 'transparent',
              fontWeight: 600,
              fontSize: 12,
              borderRadius: 999,
              cursor: 'pointer',
            }}
          >
            Edit Photo
          </button>
        </div>

        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
          {/* Account details (2-wide) */}
          <div className="wa-kit-card" style={{ gridColumn: 'span 2' }}>
            <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>Account Details</h3>
            <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 wa-gap-4">
              <FormField label="Full Name" defaultValue={name} />
              <FormField label="Email" type="email" defaultValue={email} />
              <FormField label="Location" defaultValue={location} />
              <FormField label="Program Interest">
                <select
                  defaultValue={programInterest}
                  className="wa-kit-focus"
                  style={{
                    marginTop: 4,
                    width: '100%',
                    fontSize: 14,
                    border: '1px solid var(--wa-border)',
                    borderRadius: 'var(--wa-radius-sm)',
                    padding: '10px 12px',
                    outline: 'none',
                    background: 'var(--wa-surface)',
                    color: 'var(--wa-text)',
                  }}
                >
                  {programOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            <button
              type="button"
              className="wa-kit-focus"
              style={{
                marginTop: 20,
                padding: '10px 20px',
                background: 'var(--wa-accent)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Save Changes
            </button>
          </div>

          {/* Notifications */}
          <div className="wa-kit-card">
            <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>Notifications</h3>
            <div className="wa-space-y-4">
              {prefs.map((p) => (
                <Toggle key={p.key} label={p.label} checked={p.enabled} onChange={(v) => togglePref(p.key, v)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
