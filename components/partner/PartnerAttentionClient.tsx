'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type StaleMember = {
  id: string;
  fullName: string;
  stage: string;
  stageLabel: string;
  programTitle: string;
  lastUpdatedAt: string;
  staleDays: number;
};

type LogRow = {
  id: string;
  memberId: string;
  memberName: string;
  channel: string;
  note: string;
  createdAt: string;
  createdByName: string;
};

type MemberOption = { id: string; fullName: string };

export default function PartnerAttentionClient() {
  const [stale, setStale] = useState<StaleMember[] | null>(null);
  const [allMembers, setAllMembers] = useState<MemberOption[] | null>(null);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [memberId, setMemberId] = useState('');
  const [channel, setChannel] = useState<'email' | 'call' | 'text' | 'other'>('email');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [r1, r2, r3] = await Promise.all([
      fetch('/api/partner/members/needs-attention', { credentials: 'include' }),
      fetch('/api/partner/outreach', { credentials: 'include' }),
      fetch('/api/partner/referral-members', { credentials: 'include' }),
    ]);
    if (r1.ok) {
      const d = (await r1.json()) as { members: StaleMember[] };
      setStale(d.members);
    }
    if (r2.ok) {
      const d = (await r2.json()) as { logs: LogRow[] };
      setLogs(d.logs);
    }
    if (r3.ok) {
      const d = (await r3.json()) as { members: MemberOption[] };
      setAllMembers(d.members);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!memberId || !note.trim()) {
      setMessage('Choose a member and add a note.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch('/api/partner/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId, channel, note: note.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(typeof data.error === 'string' ? data.error : 'Save failed');
        return;
      }
      setNote('');
      setMessage('Outreach logged.');
      await reload();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="partner-attention-console">
      <section className="partner-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Members needing a check-in</h2>
        <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Applied or enrolled referrals with no profile update in 7+ days.
        </p>
        {!stale ? (
          <p>Loading…</p>
        ) : stale.length === 0 ? (
          <p style={{ color: 'var(--color-gray-600)' }}>No one is stale right now.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {stale.map((m) => (
              <li
                key={m.id}
                style={{
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <div>
                  <Link href={`/partner/members/${m.id}`} style={{ fontWeight: 600 }}>
                    {m.fullName}
                  </Link>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                    {m.stageLabel} · {m.programTitle} · no update {m.staleDays}d
                  </div>
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setMemberId(m.id)}>
                  Log outreach
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="partner-panel" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Log outreach</h2>
        {message ? <p role="status">{message}</p> : null}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 480 }}>
          <label>
            <span className="sr-only">Member</span>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="">Select member…</option>
              {(allMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Channel
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              style={{ width: '100%', padding: '0.5rem' }}
            >
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            Note
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '0.5rem' }}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save log'}
          </button>
        </form>
      </section>

      <section className="partner-panel" style={{ padding: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Recent outreach</h2>
        {!logs ? (
          <p>Loading…</p>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--color-gray-600)' }}>No logs yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {logs.map((l) => (
              <li
                key={l.id}
                style={{
                  padding: '0.65rem 0',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.9rem',
                }}
              >
                <strong>{l.memberName}</strong> · {l.channel} · {new Date(l.createdAt).toLocaleString()}
                <div style={{ color: 'var(--color-gray-600)', marginTop: '0.25rem' }}>{l.note}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-gray-500)' }}>By {l.createdByName}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
