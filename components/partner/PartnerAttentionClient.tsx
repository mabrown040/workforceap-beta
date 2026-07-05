'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Bell, Clock, Eye, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CardHead, FormField, QueueRow, StatusTag, type QueueTone } from '@/components/portal/kit';

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

const TIER_TONE: Record<AttentionMember['riskTier'], QueueTone> = {
  high: 'red',
  medium: 'yellow',
  low: 'blue',
  watch: 'blue',
};

const TIER_ICON: Record<AttentionMember['riskTier'], LucideIcon> = {
  high: AlertTriangle,
  medium: Clock,
  low: Eye,
  watch: Bell,
};

const kitFieldStyle: React.CSSProperties = {
  marginTop: 4,
  width: '100%',
  fontSize: 13,
  border: '1px solid var(--wa-border)',
  borderRadius: 'var(--wa-radius-sm)',
  padding: '8px 10px',
  outline: 'none',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
};

const kitSmallSelectStyle: React.CSSProperties = {
  fontSize: 12,
  border: '1px solid var(--wa-border)',
  borderRadius: 'var(--wa-radius-sm)',
  padding: '5px 8px',
  outline: 'none',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
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
    <div className="wa-flex wa-flex-col wa-gap-4">
      <section className="wa-kit-card">
        <CardHead title="Who needs you right now" />
        <p style={{ color: 'var(--wa-muted)', fontSize: 13, marginTop: -8, marginBottom: 16, lineHeight: 1.5 }}>
          Sorted with highest urgency first — quiet days show how long it has been since the member updated their
          profile. Assign owners and log outreach so nothing slips through the cracks.
        </p>
        <div role="tablist" aria-label="Risk tier" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['all', 'high', 'medium', 'low', 'watch'] as const).map((t) => {
            const active = tierFilter === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pushTierRoute(t)}
                className="wa-kit-focus"
                style={{
                  textTransform: 'capitalize',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '6px 14px',
                  borderRadius: 999,
                  border: `1px solid ${active ? 'var(--wa-accent)' : 'var(--wa-border)'}`,
                  background: active ? 'var(--wa-accent)' : 'var(--wa-surface)',
                  color: active ? 'var(--wa-on-accent)' : 'var(--wa-text)',
                  cursor: 'pointer',
                }}
              >
                {t === 'all' ? 'All' : t}
                {tierCounts ? (
                  <span className="wa-tabular-nums" style={{ marginLeft: 6, opacity: 0.85 }}>
                    {t === 'all' ? tierCounts.all : tierCounts[t]}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {loadError ? (
          <div role="alert" className="wa-kit-card wa-kit-card--sm">
            <p style={{ color: 'var(--wa-muted)', marginBottom: 12 }}>{loadError}</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void reload()}>
              Retry
            </button>
          </div>
        ) : !rows ? (
          <p style={{ color: 'var(--wa-muted)' }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--wa-muted)' }}>No members in this filter. Try &ldquo;All&rdquo; or check back later.</p>
        ) : (
          <div className="wa-flex wa-flex-col wa-gap-3">
            {filtered.map((m) => {
              const Icon = TIER_ICON[m.riskTier];
              return (
                <div key={m.memberId} className="wa-flex wa-flex-col wa-gap-2">
                  <QueueRow
                    tone={TIER_TONE[m.riskTier]}
                    icon={<Icon size={16} aria-hidden />}
                    title={m.fullName}
                    meta={`${m.stageLabel} · ${m.programTitle} · quiet ${m.staleDays}d`}
                    flag={m.riskTier.toUpperCase()}
                    action={
                      <Link href={`/partner/referred-members/${m.memberId}`} className="portal-section-action">
                        Review
                      </Link>
                    }
                  />
                  <div style={{ paddingLeft: 50, fontSize: 12, color: 'var(--wa-text)' }}>
                    <strong>Next:</strong> <span style={{ color: 'var(--wa-muted)' }}>{m.nextBestAction}</span>
                  </div>
                  <div style={{ paddingLeft: 50, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--wa-muted)' }}>
                      Owner
                      <select
                        aria-label={`Assign owner for ${m.fullName}`}
                        value={m.assignedPartnerUserId ?? ''}
                        disabled={assignBusy === m.memberId || !team}
                        onChange={(e) => {
                          const v = e.target.value;
                          void assign(m.memberId, v === '' ? null : v);
                        }}
                        className="wa-kit-focus"
                        style={kitSmallSelectStyle}
                      >
                        <option value="">Unassigned</option>
                        {(team ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <span style={{ fontSize: 11, color: 'var(--wa-muted)' }}>
                      Last touch: {m.lastTouchName ?? '—'}
                    </span>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setMemberId(m.memberId)}>
                      Log outreach
                    </button>
                    <Link
                      href={`/partner/messages?memberId=${m.memberId}`}
                      className="btn btn-outline btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <MessageSquare size={13} aria-hidden />
                      Message
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="wa-kit-card">
        <CardHead title="Log outreach" />
        {message ? (
          <p role="status" style={{ fontSize: 13, color: 'var(--wa-accent)', fontWeight: 600, marginTop: -8, marginBottom: 12 }}>
            {message}
          </p>
        ) : null}
        <form onSubmit={submit} className="wa-grid wa-grid-cols-1 md:wa-grid-cols-3 wa-gap-3" style={{ maxWidth: 640 }}>
          <FormField label="Member">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required style={kitFieldStyle}>
              <option value="">Select member…</option>
              {(allMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Channel">
            <select value={channel} onChange={(e) => setChannel(e.target.value as typeof channel)} style={kitFieldStyle}>
              <option value="email">Email</option>
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Note" full>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              required
              style={{ ...kitFieldStyle, resize: 'vertical' }}
            />
          </FormField>
          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save log'}
            </button>
          </div>
        </form>
      </section>

      <section className="wa-kit-card">
        <CardHead title="Recent outreach" />
        {!logs ? (
          <p style={{ color: 'var(--wa-muted)' }}>Loading…</p>
        ) : logs.length === 0 ? (
          <p style={{ color: 'var(--wa-muted)' }}>No logs yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {logs.map((l) => (
              <li key={l.id} style={{ paddingBottom: 10, borderBottom: '1px solid var(--wa-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--wa-text)' }}>{l.memberName}</span>
                  <StatusTag tone="muted">{l.channel}</StatusTag>
                  <span style={{ fontSize: 11, color: 'var(--wa-muted)' }}>{new Date(l.createdAt).toLocaleString()}</span>
                </div>
                <div style={{ color: 'var(--wa-muted)', marginTop: 4, fontSize: 13 }}>{l.note}</div>
                <div style={{ fontSize: 11, color: 'var(--wa-muted)', marginTop: 2 }}>By {l.createdByName}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
