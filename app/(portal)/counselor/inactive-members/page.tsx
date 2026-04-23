'use client';

import { useState, useEffect } from 'react';

interface InactiveMember {
  id: string;
  email: string;
  joinedAt: string;
  lastActiveAt: string | null;
  daysInactive: number;
  phone: string | null;
}

export default function InactiveMembersPage() {
  const [days, setDays] = useState(7);
  const [members, setMembers] = useState<InactiveMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadMembers();
  }, [days]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/counselor/inactive-members?days=${days}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      setError('Could not load inactive members');
    } finally {
      setLoading(false);
    }
  };

  const logOutreach = async (member: InactiveMember) => {
    setSendingReminder(member.id);
    try {
      await fetch('/api/counselor/remind-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, daysInactive: member.daysInactive }),
      });
      setReminderSent((prev) => new Set(prev).add(member.id));
    } catch {
      // Silently fail — UI still works
    } finally {
      setSendingReminder(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return 'Never';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const severity = (daysInactive: number) => {
    if (daysInactive >= 30) return { color: 'var(--color-error)', label: 'Critical' };
    if (daysInactive >= 14) return { color: 'var(--color-orange)', label: 'Warning' };
    return { color: 'var(--color-yellow)', label: 'At Risk' };
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Inactive Members</h1>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '0.9rem' }}>
          Members who haven't been active on the platform. Reach out directly by email or phone, then log the outreach here so other staff can see the member was contacted.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: days === d ? 'var(--color-accent)' : 'var(--surface-container-high)',
              color: days === d ? '#fff' : 'var(--color-on-surface-variant)',
              fontWeight: days === d ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {d}+ Days
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)' }}>
          Loading…
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--color-error)', padding: '1rem', textAlign: 'center' }}>{error}</div>
      )}

      {!loading && !error && members.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: '0.5rem', display: 'block' }}>celebration</span>
          All members are active! No one has been inactive for {days}+ days.
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div style={{ background: 'var(--surface-container)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--outline-variant)', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{members.length} members inactive</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Last updated {new Date().toLocaleTimeString()}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-container-high)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Member</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Inactive</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Active</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: 'var(--color-on-surface-variant)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const sev = severity(m.daysInactive);
                  return (
                    <tr key={m.id} style={{ borderTop: '1px solid var(--outline-variant)' }}>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.email}</div>
                          {m.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
                              {m.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          background: `color-mix(in srgb, ${sev.color} 12%, transparent)`,
                          color: sev.color,
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}>
                          {m.daysInactive} days
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                        {formatDate(m.lastActiveAt)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>
                        {formatDate(m.joinedAt)}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => logOutreach(m)}
                          disabled={sendingReminder === m.id || reminderSent.has(m.id)}
                          title="Mark that you contacted this member by email or phone. Does not send a message automatically."
                          style={{
                            padding: '0.5rem 0.875rem',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            background: reminderSent.has(m.id) ? 'var(--color-green)' : 'var(--color-accent)',
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            cursor: sendingReminder === m.id || reminderSent.has(m.id) ? 'not-allowed' : 'pointer',
                            opacity: sendingReminder === m.id ? 0.7 : 1,
                          }}
                        >
                          {sendingReminder === m.id ? 'Saving…' : reminderSent.has(m.id) ? 'Logged ✓' : 'Log Outreach'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
