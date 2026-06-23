'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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

  return (
    <div className="partner-attention-console">
      <section className="partner-panel partner-attention-queue" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.35rem' }}>Who needs you right now</h2>
        <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Sorted with highest urgency first — quiet days show how long it has been since the member updated their profile. Assign owners
          and log outreach so nothing slips through the cracks.
        </p>
        <div className="partner-tier-filters" role="tablist" aria-label="Risk tier">
          {(['all', 'high', 'medium', 'low', 'watch'] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`partner-tier-filter${tierFilter === t ? ' is-active' : ''}`}
              onClick={() => pushTierRoute(t)}
              role="tab"
              aria-selected={tierFilter === t}
            >
              <span className="partner-tier-filter-inner">
                {t === 'all' ? 'All' : t}
                {tierCounts ? (
                  <span className="partner-tier-filter-count">{t === 'all' ? tierCounts.all : tierCounts[t]}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
        {loadError ? (
          <div role="alert" className="portal-card portal-card--flat" style={{ padding: '1rem' }}>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>{loadError}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : !rows ? (
          <p>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No members in this filter. Try “All” or check back later.</p>
        ) : (
          <ul className="partner-attention-list">
            {filtered.map((m) => (
              <li key={m.memberId} className={`partner-attention-row tier-${m.riskTier}`}>
                <div className="partner-attention-main">
                  <span className={`partner-risk-pill tier-${m.riskTier}`}>{m.riskTier}</span>
                  <Link href={`/partner/referred-members/${m.memberId}`} className="partner-attention-name">
                    {m.fullName}
                  </Link>
                  <div className="partner-attention-meta">
                    {m.stageLabel} · {m.programTitle} · quiet {m.staleDays}d
                  </div>
                  <div className="partner-attention-next">
                    <strong>Next:</strong> {m.nextBestAction}
                  </div>
                  <div className="partner-attention-owners">
                    <span>Owner: {m.assignedToName ?? '—'}</span>
                    <span> · Last touch: {m.lastTouchName ?? '—'}</span>
                  </div>
                </div>
                <div className="partner-attention-side">
                  <select
                    className="partner-assign-select"
                    aria-label={`Assign owner for ${m.fullName}`}
                    value={m.assignedPartnerUserId ?? ''}
                    disabled={assignBusy === m.memberId || !team}
                    onChange={(e) => {
                      const v = e.target.value;
                      void assign(m.memberId, v === '' ? null : v);
                    }}
                  >
                    <option value="">Unassigned</option>
                    {(team ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setMemberId(m.memberId)}>
                    Log outreach
                  </button>
                  <a
                    href={`/partner/messages?memberId=${m.memberId}`}
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '0.875rem', fontVariationSettings: "'FILL' 1" }}>forum</span>
                    Message
                  </a>
                </div>
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
          <p style={{ color: 'var(--color-on-surface-variant)' }}>No logs yet.</p>
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
                <div style={{ color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>{l.note}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>By {l.createdByName}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
