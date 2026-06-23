'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DesignSurface, Avatar, FormField, Toggle } from '@/components/portal/kit';
import { getErrorMessageFromResponse } from '@/lib/fetchWithTimeout';

/**
 * Member Portal — PROFILE view (account details + notification prefs).
 * Faithful port of `data-view-panel="profile"` in
 * docs/mockups/workforceap-member-suite.html.
 *
 * Interactive (form fields + toggles) → 'use client'.
 *
 * Target route: app/(portal)/dashboard/profile
 * Surface: warm (member-facing).
 *
 * Real save mechanism (reuses the same endpoints the legacy
 * DashboardProfileForm + SettingsForm already POST to):
 *   - Account details  → PATCH /api/member/dashboard-profile
 *   - Notification prefs → PATCH /api/member/settings
 *
 * The `dashboard-profile` endpoint upserts the whole Profile row, so the
 * page passes through existing profile fields the kit form does not edit
 * (phone/address/linkedin/bio/…) via `accountPassthrough` to avoid wiping
 * them on save.
 */

interface ProfileBadge {
  label: string;
  bg: string;
  color: string;
}

/**
 * Notification preference. `field` ties the toggle to the real boolean column
 * persisted by PATCH /api/member/settings. When omitted (e.g. default demo
 * prefs), the toggle is local-only.
 */
interface NotificationPref {
  key: string;
  label: string;
  enabled: boolean;
  field?: 'notificationsUpdates' | 'notificationsReminders';
}

/**
 * Existing profile fields the kit form does NOT surface but which the
 * dashboard-profile upsert would otherwise overwrite. Passed through on save
 * so we never clobber data the member entered on the legacy form.
 */
export interface MemberProfileAccountPassthrough {
  phone?: string | null;
  address?: string | null;
  state?: string | null;
  zip?: string | null;
  referralSource?: string | null;
  linkedin?: string | null;
  bio?: string | null;
  hasEmploymentBarrier?: boolean;
  barrierTypes?: string[];
  employmentStatusAtEnroll?: string | null;
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
  /**
   * Existing profile values to round-trip on save (see
   * MemberProfileAccountPassthrough). When provided alongside live data, the
   * "Save Changes" button persists to PATCH /api/member/dashboard-profile.
   */
  accountPassthrough?: MemberProfileAccountPassthrough;
  /**
   * When true, the Account Details save and notification toggles persist to the
   * real endpoints. When false (the default for the standalone demo), the form
   * stays local-only so the kit can be previewed without a backend.
   */
  live?: boolean;
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
  accountPassthrough,
  live = false,
}: MemberProfileKitProps) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPref[]>(notifications);

  // Account-details form state (only Full Name + Location are editable +
  // persisted; Email and Program Interest are read-only here).
  const [fullName, setFullName] = useState(name);
  const [loc, setLoc] = useState(location);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSaved, setAccountSaved] = useState(false);

  // Notification toggle state (per-key error/saving).
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);

  const togglePref = async (key: string, value: boolean) => {
    const pref = prefs.find((p) => p.key === key);
    const prev = prefs;
    // Optimistic update.
    setPrefs((cur) => cur.map((p) => (p.key === key ? { ...p, enabled: value } : p)));

    // Local-only toggle (demo prefs without a mapped column, or non-live mode).
    if (!live || !pref?.field) return;

    setPrefError(null);
    setSavingPref(key);
    try {
      const res = await fetch('/api/member/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [pref.field]: value }),
      });
      if (!res.ok) {
        setPrefs(prev); // revert
        setPrefError(await getErrorMessageFromResponse(res));
        return;
      }
      router.refresh();
    } catch {
      setPrefs(prev); // revert
      setPrefError('Could not save notification setting. Please try again.');
    } finally {
      setSavingPref(null);
    }
  };

  const handleSaveAccount = async () => {
    if (!live) return;
    setAccountError(null);
    setAccountSaved(false);

    // Full Name → first/last (endpoint requires both, min 1 char each).
    const trimmedName = fullName.trim();
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? '';
    const lastName = parts.slice(1).join(' ');
    if (!firstName || !lastName) {
      setAccountError('Please enter your full name (first and last).');
      return;
    }

    const pt = accountPassthrough ?? {};
    setSavingAccount(true);
    try {
      const res = await fetch('/api/member/dashboard-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          // Location maps to the city field; round-trip the rest of the
          // address so the upsert does not wipe it.
          city: loc.trim() || null,
          state: pt.state ?? null,
          zip: pt.zip ?? null,
          phone: pt.phone ?? null,
          address: pt.address ?? null,
          referralSource: pt.referralSource ?? null,
          linkedin: pt.linkedin ?? null,
          bio: pt.bio ?? null,
          hasEmploymentBarrier: pt.hasEmploymentBarrier ?? false,
          barrierTypes: pt.barrierTypes ?? [],
          employmentStatusAtEnroll: pt.employmentStatusAtEnroll ?? null,
        }),
      });
      if (!res.ok) {
        setAccountError(await getErrorMessageFromResponse(res));
        return;
      }
      setAccountSaved(true);
      router.refresh();
    } catch {
      setAccountError('Could not save your details. Please try again.');
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-5">
        <h1 className="sr-only">My profile</h1>
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
          <p style={{ maxWidth: 180, fontSize: 12, color: 'var(--wa-muted)', textAlign: 'center' }}>
            Ask your advisor if your profile photo needs to change.
          </p>
        </div>

        <div className="wa-grid wa-grid-cols-1 lg:wa-grid-cols-3 wa-gap-5">
          {/* Account details (2-wide on lg; full-width single column below — the
              span only applies where the 3-col grid exists so it can't create an
              overflowing implicit track on mobile/tablet). */}
          <div className="wa-kit-card lg:wa-col-span-2">
            <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>Account Details</h3>
            <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 wa-gap-4">
              <FormField
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <FormField label="Email" type="email" value={email} readOnly disabled />
              <FormField
                label="Location"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              />
              <FormField label="Program Interest">
                <select
                  value={programInterest}
                  disabled
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
                  {[programInterest, ...programOptions.filter((o) => o !== programInterest)].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {live ? (
              <p style={{ fontSize: 12, color: 'var(--wa-muted)', marginTop: 8 }}>
                Email and program are managed by your counselor and can&apos;t be changed here.
              </p>
            ) : null}
            {accountError ? (
              <p role="alert" style={{ fontSize: 13, color: 'var(--wa-accent)', fontWeight: 600, marginTop: 12 }}>
                {accountError}
              </p>
            ) : null}
            {accountSaved && !accountError ? (
              <p role="status" aria-live="polite" style={{ fontSize: 13, color: 'var(--wa-success)', fontWeight: 600, marginTop: 12 }}>
                Saved.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSaveAccount}
              disabled={!live || savingAccount}
              className="wa-kit-focus"
              style={{
                marginTop: 20,
                padding: '10px 20px',
                background: 'var(--wa-accent)',
                color: 'var(--wa-on-accent)',
                fontWeight: 600,
                fontSize: 14,
                borderRadius: 999,
                border: 'none',
                cursor: !live || savingAccount ? 'not-allowed' : 'pointer',
                opacity: !live || savingAccount ? 0.7 : 1,
              }}
            >
              {savingAccount ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {/* Notifications */}
          <div className="wa-kit-card">
            <h3 style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', marginBottom: 16 }}>Notifications</h3>
            {prefError ? (
              <p role="alert" style={{ fontSize: 13, color: 'var(--wa-accent)', fontWeight: 600, marginBottom: 12 }}>
                {prefError}
              </p>
            ) : null}
            <div className="wa-space-y-4">
              {prefs.map((p) => (
                <Toggle
                  key={p.key}
                  label={savingPref === p.key ? `${p.label} (saving…)` : p.label}
                  checked={p.enabled}
                  onChange={(v) => togglePref(p.key, v)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
