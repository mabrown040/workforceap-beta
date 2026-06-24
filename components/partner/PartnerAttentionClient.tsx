'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { StatusTag, FormField } from '@/components/portal/kit';
import type { KitTone } from '@/components/portal/kit';

type AttentionMember = {
  memberId: string;
  fullName: string;
  stage: string;
  stageLabel: string;
  programTitle: string;
  staleDays: number;
  riskTier: 'high' | 'medium' | 'low' | 'watch';
  nextBestAction: string;
  assignedPartnerUserId: string | null;
  assignedToName: string | null;
  lastTouchName: string | null;
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
type TeamUser = { id: string; fullName: string; email: string };

type TierFilter = 'all' | 'high' | 'medium' | 'low' | 'watch';

const TIER_ORDER: Record<AttentionMember['riskTier'], number> = {
  high: 0,
  medium: 1,
  low: 2,
  watch: 3,
};

const RISK_TONE: Record<AttentionMember['riskTier'], KitTone> = {
  high: 'alert',
  medium: 'warn',
  low: 'info',
  watch: 'muted',
};

export default function PartnerAttentionClient({ initialTier = 'high' as TierFilter }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<AttentionMember[] | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>(initialTier);
  const [team, setTeam] = useState<TeamUser[] | null>(null);
  const [allMembers, setAllMembers] = useState<MemberOption[] | null>(null);
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [memberId, setMemberId] = useState('');
  const [channel, setChannel] = useState<'email' | 'call' | 'text' | 'other'>('email');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [assignBusy, setAssignBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const tr = searchParams?.get('tier');
    if (!tr) {
      setTierFilter('high');
      return;
    }
    if (tr === 'high' || tr === 'medium' || tr === 'low' || tr === 'watch' || tr === 'all') {
      setTierFilter(tr);
    }
  }, [searchParams]);

  const pushTierRoute = useCallback(
    (t: TierFilter) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      if (t === 'high') next.delete('tier');
      else next.set('tier', t);
      const qs = next.toString();
      if (pathname) router.replace(qs.length ? `${pathname}?${qs}` : pathname, { scroll: false });
      setTierFilter(t);
    },
    [pathname, router, searchParams],
  );

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch('/api/partner/members/needs-attention', { credentials: 'include' }),
        fetch('/api/partner/outreach', { credentials: 'include' }),
        fetch('/api/partner/referral-members', { credentials: 'include' }),
        fetch('/api/partner/team-assign', { credentials: 'include' }),
      ]);
      if (!r1.ok) {
        setRows([]);
        setLoadError('The attention queue could not load. Try again in a moment.');
      } else {
        const d = (await r1.json()) as { members: AttentionMember[] };
        setRows(d.members);
      }
      if (r2.ok) {
        const d = (await r2.json()) as { logs: LogRow[] };
        setLogs(d.logs);
      }
      if (r3.ok) {
        const d = (await r3.json()) as { members: MemberOption[] };
        setAllMembers(d.members);
      }
      if (r4.ok) {
        const d = (await r4.json()) as { users: TeamUser[] };
        setTeam(d.users);
      }
    } catch {
      setRows([]);
      setLoadError('The attention queue could not load. Check your connection and retry.');
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const tierCounts = useMemo(() => {
    if (!rows) return null;
    let high = 0;
    let medium = 0;
    let low = 0;
    let watch = 0;
    for (const r of rows) {
      if (r.riskTier === 'high') high++;
      else if (r.riskTier === 'medium') medium++;
      else if (r.riskTier === 'low') low++;
      else watch++;
    }
    return { all: rows.length, high, medium, low, watch };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const subset = tierFilter === 'all' ? rows : rows.filter((r) => r.riskTier === tierFilter);
    return [...subset].sort((a, b) => {
      const o = TIER_ORDER[a.riskTier] - TIER_ORDER[b.riskTier];
      if (o !== 0) return o;
      return b.staleDays - a.staleDays;
    });
  }, [rows, tierFilter]);

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
      window.location.reload();
    } finally {
      setSaving(false);
    }
  };

  const assign = async (memberIdTarget: string, userId: string | null) => {
    setAssignBusy(memberIdTarget);
    try {
      const r = await fetch(`/api/partner/referrals/${memberIdTarget}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ assignedPartnerUserId: userId }),
      });
      if (r.ok) window.location.reload();
    } finally {
      setAssignBusy(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    marginTop: 4,
    width: '100%',
    fontSize: 14,
    border: '1px solid var(--wa-border)',
    borderRadius: 'var(--wa-radius-sm)',
    padding: '10px 12px',
    outline: 'none',
    background: 'var(--wa-surface)',
    color: 'var(--wa-text)',
  };

  const btnOutlineStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    fontSize: 13,
    fontWeight: 600,
    padding: '0.4rem 0.75rem',
    borderRadius: 'var(--wa-radius-sm)',
    border: '1px solid var(--wa-border)',
    background: 'var(--wa-surface)',
    color: 'var(--wa-text)',
    cursor: 'pointer',
    textDecoration: 'none',
  };

  return (
    <div className="wa-flex wa-flex-col wa-gap-6">
      <section className="wa-kit-card">
        <h2 className="wa-text-lg wa-font-bold" style={{ marginBottom: '0.35rem' }}>
          Who needs you right now
        </h2>
        <p className="wa-text-sm" style={{ color: 'var(--wa-muted)', marginBottom: '1rem' }}>
          Sorted with highest urgency first — quiet days show how long it has been since the member updated their profile. Assign owners
          and log outreach so nothing slips through the cracks.
        </p>
        <div
          role="tablist"
          aria-label="Risk tier"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: 4,
            marginBottom: '1rem',
            background: 'var(--wa-bg)',
            border: '1px solid var(--wa-border)',
            borderRadius: 'var(--wa-radius-sm)',
          }}
        >
          {(['all', 'high', 'medium', 'low', 'watch'] as const).map((t) => {
            const active = tierFilter === t;
            return (
              <button
                key={t}
                type="button"
                className="wa-kit-focus"
                onClick={() => pushTierRoute(t)}
                role="tab"
                aria-selected={active}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.35rem 0.7rem',
                  borderRadius: 'var(--wa-radius-sm)',
                  border: '1px solid transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  background: active ? 'var(--wa-surface)' : 'transparent',
                  color: active ? 'var(--wa-accent)' : 'var(--wa-muted)',
                  boxShadow: active ? 'var(--wa-shadow)' : 'none',
                }}
              >
                {t === 'all' ? 'All' : t}
                {tierCounts ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: active ? 'var(--wa-accent-soft)' : 'var(--wa-border)',
                      color: active ? 'var(--wa-accent)' : 'var(--wa-muted)',
                    }}
                  >
                    {t === 'all' ? tierCounts.all : tierCounts[t]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {loadError ? (
          <div role="alert" className="wa-kit-card wa-kit-card--sm">
            <p className="wa-text-sm" style={{ color: 'var(--wa-muted)', marginBottom: '0.75rem' }}>
              {loadError}
            </p>
            <button type="button" className="wa-kit-focus" style={btnOutlineStyle} onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : !rows ? (
          <p className="wa-text-sm" style={{ color: 'var(--wa-muted)' }}>
            Loading…
          </p>
        ) : filtered.length === 0 ? (
          <p className="wa-text-sm" style={{ color: 'var(--wa-muted)' }}>
            No members in this filter. Try “All” or check back later.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((m) => (
              <li
                key={m.memberId}
                className="wa-kit-card wa-kit-card--sm"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 16,
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ minWidth: 0, flex: '1 1 18rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <StatusTag tone={RISK_TONE[m.riskTier]}>{m.riskTier}</StatusTag>
                    <Link
                      href={`/partner/referred-members/${m.memberId}`}
                      className="wa-font-semibold"
                      style={{ color: 'var(--wa-text)', textDecoration: 'none' }}
                    >
                      {m.fullName}
                    </Link>
                  </div>
                  <div className="wa-text-xs" style={{ color: 'var(--wa-muted)' }}>
                    {m.stageLabel} · {m.programTitle} · quiet {m.staleDays}d
                  </div>
                  <div className="wa-text-sm" style={{ color: 'var(--wa-text)' }}>
                    <strong>Next:</strong> {m.nextBestAction}
                  </div>
                  <div className="wa-text-xs" style={{ color: 'var(--wa-muted)' }}>
                    <span>Owner: {m.assignedToName ?? '—'}</span>
                    <span> · Last touch: {m.lastTouchName ?? '—'}</span>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    alignItems: 'stretch',
                    flex: '0 1 auto',
                  }}
                >
                  <select
                    className="wa-kit-focus"
                    aria-label={`Assign owner for ${m.fullName}`}
                    value={m.assignedPartnerUserId ?? ''}
                    disabled={assignBusy === m.memberId || !team}
                    onChange={(e) => {
                      const v = e.target.value;
                      void assign(m.memberId, v === '' ? null : v);
                    }}
                    style={inputStyle}
                  >
                    <option value="">Unassigned</option>
                    {(team ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="wa-kit-focus"
                      style={{ ...btnOutlineStyle, flex: 1 }}
                      onClick={() => setMemberId(m.memberId)}
                    >
                      Log outreach
                    </button>
                    <a
                      href={`/partner/messages?memberId=${m.memberId}`}
                      className="wa-kit-focus"
                      style={{ ...btnOutlineStyle, flex: 1 }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '0.875rem', fontVariationSettings: "'FILL' 1" }}
                      >
                        forum
                      </span>
                      Message
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wa-kit-card">
        <h2 className="wa-text-lg wa-font-bold" style={{ marginBottom: '0.75rem' }}>
          Log outreach
        </h2>
        {message ? (
          <p role="status" className="wa-text-sm" style={{ color: 'var(--wa-accent)', marginBottom: '0.5rem' }}>
            {message}
          </p>
        ) : null}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: 480 }}>
          <div>
            <span className="sr-only">Member</span>
            <select
              className="wa-kit-focus"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Select member…</option>
              {(allMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </div>
          <FormField label="Channel">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              style={inputStyle}
            >
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              required
              style={inputStyle}
            />
          </FormField>
          <button
            type="submit"
            className="wa-kit-focus"
            disabled={saving}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              padding: '0.55rem 1rem',
              borderRadius: 'var(--wa-radius-sm)',
              border: '1px solid transparent',
              background: 'var(--wa-accent)',
              color: 'var(--wa-on-accent)',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save log'}
          </button>
        </form>
      </section>

      <section className="wa-kit-card">
        <h2 className="wa-text-lg wa-font-bold" style={{ marginBottom: '0.75rem' }}>
          Recent outreach
        </h2>
        {!logs ? (
          <p className="wa-text-sm" style={{ color: 'var(--wa-muted)' }}>
            Loading…
          </p>
        ) : logs.length === 0 ? (
          <p className="wa-text-sm" style={{ color: 'var(--wa-muted)' }}>
            No logs yet.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {logs.map((l) => (
              <li
                key={l.id}
                className="wa-text-sm"
                style={{
                  padding: '0.65rem 0',
                  borderBottom: '1px solid var(--wa-border)',
                }}
              >
                <strong>{l.memberName}</strong> · {l.channel} · {new Date(l.createdAt).toLocaleString()}
                <div style={{ color: 'var(--wa-muted)', marginTop: '0.25rem' }}>{l.note}</div>
                <div className="wa-text-xs" style={{ color: 'var(--wa-muted)' }}>
                  By {l.createdByName}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
