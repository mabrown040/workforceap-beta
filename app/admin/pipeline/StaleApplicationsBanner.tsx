'use client';

import { useState } from 'react';
import { remindStaleApplication } from './remindAction';

export default function StaleApplicationsBanner({ staleApps }: { staleApps: any[] }) {
  const [reminded, setReminded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  if (staleApps.length === 0) return null;

  const handleRemind = async (appId: string, userId: string) => {
    setLoading((prev) => ({ ...prev, [appId]: true }));
    try {
      await remindStaleApplication(appId, userId);
      setReminded((prev) => ({ ...prev, [appId]: true }));
    } catch (e) {
      console.error(e);
      alert('Failed to send reminder');
    }
    setLoading((prev) => ({ ...prev, [appId]: false }));
  };

  return (
    <div className="portal-alert portal-alert--accent" style={{ marginBottom: '1.5rem', display: 'block' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Stale Applications (Older than 3 days)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {staleApps.map((app) => (
          <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
            <div>
              <span style={{ fontWeight: 500 }}>{app.user?.fullName}</span> ({app.user?.email}) - Applied {new Date(app.createdAt).toLocaleDateString()}
            </div>
            <button
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
              onClick={() => handleRemind(app.id, app.userId)}
              disabled={loading[app.id] || reminded[app.id]}
            >
              {reminded[app.id] ? 'Reminded' : loading[app.id] ? 'Sending...' : 'Send Reminder'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
