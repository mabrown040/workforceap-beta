'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  InboxHeader,
  InboxPane,
  InboxShell,
} from '@/components/portal/ui/inbox/InboxPrimitives';

type SlaInfo = {
  needsCounselorReply: boolean;
  memberLastMessageAt: string | null;
  breached48h: boolean;
  breached72h: boolean;
};

type ThreadRowMember = {
  id: string;
  kind: 'member';
  memberId: string | null;
  memberName: string;
  memberEmail: string;
  counselorUserId: string | null;
  counselorName: string | null;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastMessageAuthorId: string | null;
  sla: SlaInfo;
};

type ThreadRowEmployer = {
  id: string;
  kind: 'employer';
  employerId: string | null;
  employerCompanyName: string;
  employerContactEmail: string;
  needsStaffReply: boolean;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastMessageAuthorId: string | null;
};

type ThreadRowPartner = {
  id: string;
  kind: 'partner';
  partnerId: string | null;
  partnerName: string;
  needsStaffReply: boolean;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastMessageAuthorId: string | null;
};

type ThreadRow = ThreadRowMember | ThreadRowEmployer | ThreadRowPartner;

type CounselorOpt = {
  userId: string;
  fullName: string;
  partnerName: string;
};

type ThreadDetailMember = {
  kind: 'member';
  thread: { id: string; memberId: string | null; counselorUserId: string | null; updatedAt: string };
  member: { id: string; fullName: string; email: string };
  counselorName: string | null;
  counselors: CounselorOpt[];
  currentCounselorUserId: string | null;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorName: string;
    isFromMember: boolean;
  }>;
  sla: {
    needsCounselorReply: boolean;
    memberLastMessageAt: string | null;
    breached48h: boolean;
    breached72h: boolean;
  } | null;
  readOnlyNote: string;
};

type ThreadDetailEmployer = {
  kind: 'employer';
  thread: {
    id: string;
    employerId: string | null;
    portalUserLastReadAt: string | null;
    staffLastReadAt: string | null;
    staffUserId: string | null;
    updatedAt: string;
  };
  employer: { id: string; companyName: string; contactEmail: string };
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorName: string;
    isFromPortalUser: boolean;
  }>;
  sla: null;
  readOnlyNote: string;
};

type ThreadDetailPartner = {
  kind: 'partner';
  thread: {
    id: string;
    partnerId: string | null;
    portalUserLastReadAt: string | null;
    staffLastReadAt: string | null;
    staffUserId: string | null;
    updatedAt: string;
  };
  partner: { id: string; name: string };
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    authorName: string;
    isFromPortalUser: boolean;
  }>;
  sla: null;
  readOnlyNote: string;
};

type ThreadDetail = ThreadDetailMember | ThreadDetailEmployer | ThreadDetailPartner;

type InboxFilter = 'member' | 'employer' | 'partner' | 'all';

function threadListTitle(t: ThreadRow): string {
  if (t.kind === 'member') return t.memberName;
  if (t.kind === 'employer') return t.employerCompanyName;
  return t.partnerName;
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function detailTitle(d: ThreadDetail): string {
  if (d.kind === 'member') return d.member.fullName;
  if (d.kind === 'employer') return d.employer.companyName;
  return d.partner.name;
}

function detailSubtitle(d: ThreadDetail): string {
  if (d.kind === 'member') return d.member.email;
  if (d.kind === 'employer') return d.employer.contactEmail;
  return 'Partner organization';
}

function kindLabel(kind: string): string {
  if (kind === 'member') return 'Member';
  if (kind === 'employer') return 'Employer';
  return 'Partner';
}

function isFromPortalUser(d: ThreadDetail, m: ThreadDetail['messages'][number]): boolean {
  if (d.kind === 'member') return (m as ThreadDetailMember['messages'][number]).isFromMember;
  return (m as ThreadDetailEmployer['messages'][number]).isFromPortalUser;
}

export default function AdminSuperMessagesClient() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [inbox, setInbox] = useState<InboxFilter>('member');
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stats, setStats] = useState<{ threadsWithMessages: number; slaBreaches48h: number; slaBreaches72h: number } | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assigningCounselor, setAssigningCounselor] = useState(false);
  const [assignmentMsg, setAssignmentMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [staffDraft, setStaffDraft] = useState('');
  const [staffSending, setStaffSending] = useState(false);
  const [staffErr, setStaffErr] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list');
  const [showAdminControls, setShowAdminControls] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<Array<{ id: string; fullName: string; email: string }>>([]);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeCreating, setComposeCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages.length]);

  // Compose: search members
  useEffect(() => {
    if (!showCompose) return;
    const q = composeQuery.trim();
    if (q.length < 2) { setComposeResults([]); return; }
    const timer = setTimeout(async () => {
      setComposeLoading(true);
      try {
        const r = await fetch(`/api/admin/members?q=${encodeURIComponent(q)}&limit=10&role=member`, { credentials: 'include' });
        if (r.ok) setComposeResults(await r.json());
      } catch { /* ignore */ }
      finally { setComposeLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [composeQuery, showCompose]);

  useEffect(() => {
    if (showCompose) {
      setTimeout(() => composeInputRef.current?.focus(), 100);
    } else {
      setComposeQuery('');
      setComposeResults([]);
    }
  }, [showCompose]);

  const startConversation = async (memberId: string) => {
    setComposeCreating(true);
    try {
      const r = await fetch('/api/admin/messages/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
        credentials: 'include',
      });
      if (!r.ok) return;
      const data = (await r.json()) as { threadId: string };
      setShowCompose(false);
      setSelectedId(data.threadId);
      setMobileView('thread');
      refreshList();
    } catch { /* ignore */ }
    finally { setComposeCreating(false); }
  };

  const loadThreads = useCallback(
    async (opts: { reset: boolean; appendCursor?: string | null }) => {
      const isReset = opts.reset;
      const pageCursor = isReset ? null : opts.appendCursor ?? null;
      if (isReset) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '30');
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (alertsOnly) params.set('alertsOnly', '1');
        else params.set('inbox', inbox);
        if (pageCursor) params.set('cursor', pageCursor);

        const res = await fetch(`/api/admin/messages/threads?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load');
        const data = (await res.json()) as { threads: ThreadRow[]; nextCursor: string | null };

        setThreads((prev) => (isReset ? data.threads : [...prev, ...data.threads]));
        setCursor(data.nextCursor);
      } catch {
        if (isReset) setThreads([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [alertsOnly, debouncedSearch, inbox]
  );

  useEffect(() => {
    setCursor(null);
    void loadThreads({ reset: true });
  }, [debouncedSearch, alertsOnly, inbox, loadThreads]);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch('/api/admin/messages/stats', { credentials: 'include' });
        if (r.ok) setStats(await r.json());
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setStaffDraft('');
      setStaffErr(null);
      setShowAdminControls(false);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const r = await fetch(`/api/admin/messages/thread/${selectedId}`, { credentials: 'include' });
        if (!r.ok) throw new Error('load');
        const d = (await r.json()) as ThreadDetail;
        if (!cancelled) {
          setDetail(d);
          void fetch(`/api/admin/messages/thread/${selectedId}/staff`, {
            method: 'PATCH',
            credentials: 'include',
          }).catch(() => {});
        }
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const refreshList = () => {
    setCursor(null);
    void loadThreads({ reset: true });
    try {
      window.dispatchEvent(new Event('wa-nav-badges-refresh'));
    } catch {
      /* ignore */
    }
  };

  const selectThread = (id: string) => {
    setSelectedId(id);
    setMobileView('thread');
  };

  const assignCounselor = async (counselorUserId: string) => {
    if (!detail || detail.kind !== 'member') return;
    setAssigningCounselor(true);
    setAssignmentMsg(null);
    try {
      const r = await fetch(`/api/admin/members/${detail.member.id}/counselor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counselorUserId }),
        credentials: 'include',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setAssignmentMsg({ type: 'err', text: typeof data.error === 'string' ? data.error : 'Assignment failed' });
        return;
      }
      setAssignmentMsg({ type: 'ok', text: 'Counselor assigned.' });
      setTimeout(() => setAssignmentMsg(null), 5000);
      if (selectedId) {
        const detailRes = await fetch(`/api/admin/messages/thread/${selectedId}`, { credentials: 'include' });
        if (detailRes.ok) {
          const updated = (await detailRes.json()) as ThreadDetail;
          setDetail(updated);
        }
      }
      refreshList();
    } catch {
      setAssignmentMsg({ type: 'err', text: 'Network error' });
    } finally {
      setAssigningCounselor(false);
    }
  };

  const sendStaffReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !staffDraft.trim() || staffSending) return;
    setStaffSending(true);
    setStaffErr(null);
    try {
      const r = await fetch(`/api/admin/messages/thread/${selectedId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: staffDraft.trim() }),
        credentials: 'include',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setStaffErr(typeof data.error === 'string' ? data.error : 'Send failed');
        return;
      }
      setStaffDraft('');
      const detailRes = await fetch(`/api/admin/messages/thread/${selectedId}`, { credentials: 'include' });
      if (detailRes.ok) {
        setDetail((await detailRes.json()) as ThreadDetail);
      }
      refreshList();
    } catch {
      setStaffErr('Network error');
    } finally {
      setStaffSending(false);
    }
  };

  // ── Thread list pane (shared between mobile + desktop) ──

  const filterTabs = (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
      {(['member', 'employer', 'partner', 'all'] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          className={`portal-messages-filter-tab${inbox === tab && !alertsOnly ? ' portal-messages-filter-tab--active' : ''}`}
          disabled={alertsOnly && tab !== 'member'}
          onClick={() => { setAlertsOnly(false); setInbox(tab); }}
        >
          {tab === 'all' ? 'All' : tab === 'member' ? 'Members' : tab === 'employer' ? 'Employers' : 'Partners'}
        </button>
      ))}
    </div>
  );

  const listContent = (opts: { mobile: boolean }) => (
    <>
      {/* Filter tabs + search */}
      <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {filterTabs}

        <div className="portal-messages-search-wrap">
          <span className="material-symbols-outlined portal-messages-search-icon">search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or message…"
            className="portal-messages-search-input"
            autoComplete="off"
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          <input
            type="checkbox"
            checked={alertsOnly}
            onChange={(e) => {
              setAlertsOnly(e.target.checked);
              if (e.target.checked) setInbox('member');
            }}
          />
          SLA alerts only (&gt;48h)
        </label>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 0.5rem', flexWrap: 'wrap' }}>
          <span className="portal-messages-stat-chip">{stats.threadsWithMessages} threads</span>
          {stats.slaBreaches48h > 0 && (
            <span className="portal-messages-stat-chip portal-messages-stat-chip--warn">{stats.slaBreaches48h} &gt;48h</span>
          )}
          {stats.slaBreaches72h > 0 && (
            <span className="portal-messages-stat-chip portal-messages-stat-chip--danger">{stats.slaBreaches72h} &gt;72h</span>
          )}
        </div>
      )}

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
            Loading threads…
          </div>
        ) : threads.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>
            No threads found. Try adjusting filters.
          </div>
        ) : (
          threads.map((t) => {
            const title = threadListTitle(t);
            const alertBadge =
              t.kind === 'member'
                ? t.sla.breached72h ? '>72h' : t.sla.breached48h ? '>48h' : null
                : t.needsStaffReply ? 'Needs reply' : null;
            const isActive = selectedId === t.id;
            const initials = getInitials(title);

            return (
              <div key={t.id} style={{ padding: '2px 0.5rem' }}>
                <button
                  type="button"
                  onClick={() => selectThread(t.id)}
                  className={`portal-messages-thread-btn${isActive ? ' portal-messages-thread-btn--active' : ''}`}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div className="portal-messages-avatar">{initials}</div>
                    {alertBadge && (
                      <div
                        className="portal-messages-online-dot"
                        style={{
                          background: t.kind === 'member' && t.sla.breached72h ? '#ef4444' : '#f59e0b',
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-on-surface)', margin: 0 }}>
                        {title}
                      </h3>
                      <span style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                        {kindLabel(t.kind)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.lastMessagePreview || 'No messages'}
                      </p>
                      {alertBadge && <span className="portal-messages-badge">{alertBadge}</span>}
                    </div>
                  </div>
                </button>
              </div>
            );
          })
        )}

        {cursor && (
          <div style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
            <button
              type="button"
              className="portal-messages-filter-tab"
              disabled={loadingMore}
              onClick={() => void loadThreads({ reset: false, appendCursor: cursor })}
              style={{ width: '100%' }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </>
  );

  // ── Chat thread pane ──

  const chatThread = (opts: { showBackBtn: boolean }) => {
    if (!selectedId) {
      return (
        <div className="wa-flex wa-flex-col wa-items-center wa-justify-center wa-h-full wa-gap-3 wa-text-center" style={{ padding: '2rem' }}>
          <div
            className="wa-w-16 wa-h-16 wa-rounded-full wa-flex wa-items-center wa-justify-center"
            style={{ background: 'var(--surface-container-high)' }}
          >
            <span className="material-symbols-outlined wa-text-2xl" style={{ color: 'var(--color-accent)' }}>
              forum
            </span>
          </div>
          <p className="wa-text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
            Select a conversation from the list
          </p>
        </div>
      );
    }

    if (detailLoading) {
      return (
        <div className="wa-flex wa-items-center wa-justify-center wa-h-full">
          <p className="wa-text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Loading conversation…</p>
        </div>
      );
    }

    if (!detail) {
      return (
        <div className="wa-flex wa-items-center wa-justify-center wa-h-full">
          <p className="wa-text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>Could not load thread</p>
        </div>
      );
    }

    const title = detailTitle(detail);
    const subtitle = detailSubtitle(detail);
    const initials = getInitials(title);

    return (
      <div className="wa-flex wa-flex-col" style={{ height: '100%', minHeight: 0 }}>
        {/* Chat header */}
        <header className="wa-flex-shrink-0 wa-flex wa-items-center wa-gap-3 wa-px-4 wa-py-3 portal-messages-header">
          {opts.showBackBtn && (
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="portal-messages-header-btn"
              aria-label="Back to list"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
            </button>
          )}
          <div className="portal-messages-avatar wa-w-9 wa-h-9 wa-text-xs">{initials}</div>
          <div className="wa-flex-1 wa-min-w-0">
            <p className="wa-font-bold wa-text-sm wa-leading-tight wa-truncate" style={{ color: 'var(--color-on-surface)' }}>
              {title}
            </p>
            <p className="wa-text-[11px] wa-truncate" style={{ color: 'var(--color-on-surface-variant)' }}>
              {subtitle} · {kindLabel(detail.kind)}
            </p>
          </div>

          {/* Admin controls toggle */}
          <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
            {detail.kind === 'member' && (
              <button
                type="button"
                className="portal-messages-header-btn"
                onClick={() => setShowAdminControls((v) => !v)}
                aria-label="Admin controls"
                title="Admin controls"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {showAdminControls ? 'expand_less' : 'settings'}
                </span>
              </button>
            )}
            {detail.kind === 'member' && (
              <Link
                href={`/admin/members/${detail.member.id}`}
                className="portal-messages-header-btn"
                aria-label="Open member page"
                title="Open member page"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>open_in_new</span>
              </Link>
            )}
          </div>
        </header>

        {/* SLA alert banner */}
        {detail.kind === 'member' && detail.sla?.breached48h && (
          <div
            className="wa-flex-shrink-0 wa-px-4 wa-py-2 wa-text-xs wa-font-semibold"
            style={{
              background: detail.sla.breached72h
                ? 'color-mix(in srgb, #ef4444 15%, transparent)'
                : 'color-mix(in srgb, #f59e0b 15%, transparent)',
              color: detail.sla.breached72h ? '#dc2626' : '#d97706',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <span className="material-symbols-outlined wa-text-sm wa-mr-1" style={{ verticalAlign: 'middle' }}>
              warning
            </span>
            Awaiting counselor reply {detail.sla.breached72h ? '(over 72 hours)' : '(over 48 hours)'}
          </div>
        )}

        {/* Admin controls panel (collapsible, member only) */}
        {detail.kind === 'member' && showAdminControls && (
          <div
            className="wa-flex-shrink-0"
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--surface-container)',
              borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 70%, transparent)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
              Counselor: {detail.counselorName ?? 'Not assigned'}
            </div>

            {assignmentMsg && (
              <p
                style={{ fontSize: '0.75rem', margin: 0, color: assignmentMsg.type === 'ok' ? '#166534' : '#b91c1c' }}
                role="status"
              >
                {assignmentMsg.text}
              </p>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <select
                className="portal-messages-search-input"
                style={{ flex: 1, padding: '0.375rem 0.5rem', fontSize: '0.8rem' }}
                defaultValue={detail.currentCounselorUserId ?? ''}
                onChange={(e) => { if (e.target.value) void assignCounselor(e.target.value); }}
                disabled={assigningCounselor || detail.counselors.length === 0}
              >
                <option value="">Assign counselor…</option>
                {detail.counselors.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.fullName} ({c.partnerName})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Message bubbles */}
        <div
          className="wa-flex-1 wa-overflow-y-auto wa-px-4 wa-py-4 wa-space-y-3"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {detail.messages.length === 0 ? (
            <div className="wa-flex wa-flex-col wa-items-center wa-justify-center wa-h-full wa-gap-3 wa-text-center">
              <div
                className="wa-w-16 wa-h-16 wa-rounded-full wa-flex wa-items-center wa-justify-center"
                style={{ background: 'var(--surface-container-high)' }}
              >
                <span className="material-symbols-outlined wa-text-2xl" style={{ color: 'var(--color-accent)' }}>
                  chat_bubble_outline
                </span>
              </div>
              <p className="wa-text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
                No messages in this thread yet.
              </p>
            </div>
          ) : (
            detail.messages.map((m) => {
              const fromPortal = isFromPortalUser(detail, m);
              const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <div
                  key={m.id}
                  className={`wa-flex wa-flex-col ${fromPortal ? 'wa-items-start' : 'wa-items-end'}`}
                >
                  {/* Author label for staff messages */}
                  {!fromPortal && (
                    <span className="wa-text-[10px] wa-mb-0.5 wa-px-1 wa-font-semibold" style={{ color: 'var(--color-accent)' }}>
                      {m.authorName}
                    </span>
                  )}
                  <div
                    className={`wa-max-w-[78%] wa-px-4 wa-py-2.5 wa-text-sm wa-leading-snug ${
                      fromPortal ? 'portal-messages-bubble--them' : 'portal-messages-bubble--mine'
                    }`}
                  >
                    {m.body}
                  </div>
                  <time
                    className="wa-text-[10px] wa-mt-1 wa-px-1"
                    style={{ color: 'var(--color-on-surface-variant)', opacity: 0.75 }}
                  >
                    {timeStr}
                  </time>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Error */}
        {staffErr && (
          <div
            className="wa-flex-shrink-0 wa-mx-4 wa-mb-2 wa-px-3 wa-py-2 wa-rounded-lg wa-text-xs wa-text-white"
            style={{ background: 'var(--color-error, #ba1a1a)' }}
          >
            {staffErr}
          </div>
        )}

        {/* Compose bar — same style as member messaging */}
        <form
          onSubmit={sendStaffReply}
          className="wa-flex-shrink-0 wa-flex wa-items-end wa-gap-2 wa-px-3 wa-py-3 portal-messages-compose"
        >
          <textarea
            value={staffDraft}
            onChange={(e) => setStaffDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void sendStaffReply(e as unknown as React.FormEvent);
              }
            }}
            placeholder={`Reply as WorkforceAP…`}
            maxLength={8000}
            rows={1}
            className="wa-flex-1 wa-resize-none wa-px-4 wa-py-3 wa-rounded-2xl wa-text-sm portal-messages-compose-input focus:wa-outline-none focus:wa-ring-2 focus:wa-ring-[var(--color-accent)]/35 placeholder:opacity-50"
            style={{ maxHeight: '8rem', overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={staffSending || !staffDraft.trim()}
            className="wa-flex-shrink-0 wa-w-10 wa-h-10 wa-rounded-full wa-flex wa-items-center wa-justify-center active:wa-scale-95 wa-transition-all"
            style={{
              background: staffDraft.trim() ? 'var(--color-accent-dark, #6b0c29)' : 'var(--surface-container-high)',
              color: staffDraft.trim() ? '#fff' : 'var(--color-on-surface-variant)',
            }}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined wa-text-[20px]">
              {staffSending ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </form>
      </div>
    );
  };

  // ── Render ──

  // ── Compose overlay (member search) ──

  const composeOverlay = showCompose ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        background: 'rgba(0,0,0,0.45)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setShowCompose(false); }}
    >
      <div
        style={{
          background: 'var(--surface-container-lowest, #fff)',
          borderRadius: '1rem',
          width: '90%',
          maxWidth: 440,
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1rem 0.75rem' }}>
          <button
            type="button"
            className="portal-messages-header-btn"
            onClick={() => setShowCompose(false)}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: 'var(--color-on-surface)' }}>
            New message
          </h2>
        </div>

        {/* Search input */}
        <div style={{ padding: '0 1rem 0.75rem' }}>
          <div className="portal-messages-search-wrap">
            <span className="material-symbols-outlined portal-messages-search-icon">search</span>
            <input
              ref={composeInputRef}
              type="search"
              value={composeQuery}
              onChange={(e) => setComposeQuery(e.target.value)}
              placeholder="Search members by name or email…"
              className="portal-messages-search-input"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.5rem 0.75rem' }}>
          {composeLoading ? (
            <p style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
              Searching…
            </p>
          ) : composeQuery.trim().length < 2 ? (
            <p style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
              Type at least 2 characters to search
            </p>
          ) : composeResults.length === 0 ? (
            <p style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
              No members found
            </p>
          ) : (
            composeResults.map((m) => (
              <div key={m.id} style={{ padding: '2px 0.5rem' }}>
                <button
                  type="button"
                  onClick={() => void startConversation(m.id)}
                  disabled={composeCreating}
                  className="portal-messages-thread-btn"
                  style={{ width: '100%' }}
                >
                  <div className="portal-messages-avatar">{getInitials(m.fullName)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: 'var(--color-on-surface)' }}>
                      {m.fullName}
                    </p>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--color-on-surface-variant)' }}>
                      {m.email}
                    </p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-on-surface-variant)' }}>
                    chevron_right
                  </span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  ) : null;

  // ── Render ──

  return (
    <div className="admin-main-content">
      {composeOverlay}

      {/* ── Mobile view (≤md) ── */}
      <div className="wa-md:wa-hidden" style={{ minHeight: 0 }}>
        {mobileView === 'list' ? (
          <div className="portal-messages-shell">
            <header className="portal-messages-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Link href="/admin" className="portal-messages-header-btn" aria-label="Back to admin">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
                </Link>
                <h1 className="portal-messages-title">Messages</h1>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  type="button"
                  className="portal-messages-header-btn"
                  onClick={() => setShowCompose(true)}
                  aria-label="New message"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_square</span>
                </button>
                <button
                  type="button"
                  className="portal-messages-header-btn"
                  onClick={refreshList}
                  aria-label="Refresh"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>refresh</span>
                </button>
              </div>
            </header>
            {listContent({ mobile: true })}
          </div>
        ) : (
          <div className="portal-messages-shell portal-messages-shell--thread">
            {chatThread({ showBackBtn: true })}
          </div>
        )}
      </div>

      {/* ── Desktop view ── */}
      <div className="wa-hidden wa-md:wa-block">
        <InboxShell>
          <InboxPane
            variant="list"
            style={{
              width: 360,
              flexShrink: 0,
              borderRight: '1px solid color-mix(in srgb, var(--outline-variant, #e8e0dd) 70%, transparent)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <InboxHeader
              title="Threads"
              right={
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button
                    type="button"
                    className="portal-messages-header-btn"
                    onClick={() => setShowCompose(true)}
                    aria-label="New message"
                    title="New message"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_square</span>
                  </button>
                  <button
                    type="button"
                    className="portal-messages-header-btn"
                    onClick={refreshList}
                    aria-label="Refresh"
                    title="Refresh list"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
                  </button>
                </div>
              }
            />
            {listContent({ mobile: false })}
          </InboxPane>

          <InboxPane variant="thread" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {chatThread({ showBackBtn: false })}
          </InboxPane>
        </InboxShell>
      </div>
    </div>
  );
}
