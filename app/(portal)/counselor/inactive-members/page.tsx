'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/components/portal/PageHeader';
import DataTable from '@/components/portal/ui/DataTable';
import SectionHeader from '@/components/portal/ui/SectionHeader';

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
    <div style={{ width: '100%', maxWidth: 'var(--max-width, 80rem)', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.5rem) 2rem' }}>
      <PageHeader
        title="Inactive Members"
        subtitle="Members who haven't been active on the platform. Reach out directly by email or phone, then log the outreach here so other staff can see the member was contacted."
        breadcrumbs={[{ label: 'Counselor Portal', href: '/counselor' }, { label: 'Inactive Members' }]}
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[7, 14, 30].map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: days === d ? 'var(--color-accent)' : 'var(--surface-container-high)',
              color: days === d ? 'var(--color-white, #fff)' : 'var(--color-on-surface-variant)',
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
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--outline-variant)' }}>
            <SectionHeader
              title={`${members.length} members inactive`}
              action={<span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>Last updated {new Date().toLocaleTimeString()}</span>}
            />
          </div>
          <DataTable<InactiveMember>
            columns={[
              {
                key: 'member',
                header: 'Member',
                cell: (m) => (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.email}</div>
                    {m.phone && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
                        {m.phone}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'days',
                header: 'Days Inactive',
                align: 'center',
                cell: (m) => {
                  const sev = severity(m.daysInactive);
                  return (
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
                  );
                },
              },
              {
                key: 'lastActive',
                header: 'Last Active',
                cell: (m) => <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>{formatDate(m.lastActiveAt)}</span>,
              },
              {
                key: 'joined',
                header: 'Joined',
                cell: (m) => <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem' }}>{formatDate(m.joinedAt)}</span>,
              },
              {
                key: 'action',
                header: 'Action',
                align: 'right',
                cell: (m) => (
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
                      color: 'var(--color-white, #fff)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      cursor: sendingReminder === m.id || reminderSent.has(m.id) ? 'not-allowed' : 'pointer',
                      opacity: sendingReminder === m.id ? 0.7 : 1,
                    }}
                  >
                    {sendingReminder === m.id ? 'Saving…' : reminderSent.has(m.id) ? 'Logged ✓' : 'Log Outreach'}
                  </button>
                ),
              },
            ]}
            rows={members}
            rowKey={(m) => m.id}
            density="compact"
          />
        </div>
      )}
    </div>
  );
}
