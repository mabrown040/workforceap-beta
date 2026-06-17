'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getErrorMessageFromResponse } from '@/lib/fetchWithTimeout';

type SettingsFormProps = {
  defaultUpdates: boolean;
  defaultReminders: boolean;
};

export default function SettingsForm({ defaultUpdates, defaultReminders }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState(defaultUpdates);
  const [reminders, setReminders] = useState(defaultReminders);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (field: 'updates' | 'reminders', value: boolean) => {
    setError(null);
    if (field === 'updates') setUpdates(value);
    else setReminders(value);
    setLoading(true);
    try {
      const res = await fetch('/api/member/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationsUpdates: field === 'updates' ? value : updates,
          notificationsReminders: field === 'reminders' ? value : reminders,
        }),
      });
      if (!res.ok) {
        const msg = await getErrorMessageFromResponse(res);
        setError(msg);
        return;
      }
      router.refresh();
    } catch {
      setError('Could not save settings. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            background: 'rgba(173,44,77,0.08)',
            border: '1px solid rgba(173,44,77,0.2)',
            color: 'var(--color-accent)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>error</span>
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={updates}
          onChange={(e) => handleChange('updates', e.target.checked)}
          disabled={loading}
        />
        <span>Updates from WorkforceAP</span>
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={reminders}
          onChange={(e) => handleChange('reminders', e.target.checked)}
          disabled={loading}
        />
        <span>Training reminders</span>
      </label>
    </div>
  );
}
