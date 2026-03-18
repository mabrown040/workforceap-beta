'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SettingsFormProps = {
  defaultUpdates: boolean;
  defaultReminders: boolean;
};

export default function SettingsForm({ defaultUpdates, defaultReminders }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState(defaultUpdates);
  const [reminders, setReminders] = useState(defaultReminders);

  const handleChange = async (field: 'updates' | 'reminders', value: boolean) => {
    if (field === 'updates') setUpdates(value);
    else setReminders(value);
    setLoading(true);
    try {
      await fetch('/api/member/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationsUpdates: field === 'updates' ? value : updates,
          notificationsReminders: field === 'reminders' ? value : reminders,
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
