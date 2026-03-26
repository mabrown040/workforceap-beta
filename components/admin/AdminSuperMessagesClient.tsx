'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

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

function threadListSubtitle(t: ThreadRow): string {
  if (t.kind === 'member') return t.counselorName ?? 'No counselor on thread';
  if (t.kind === 'employer') return t.employerContactEmail;
  return 'Partner';
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

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
      setAssignmentMsg({ type: 'ok', text: 'Counselor assigned. Member was notified via email.' });
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

  return (
    <div className="admin-main-content admin-super-messages">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>Portal messages</h1>
        <p className="admin-muted-text" style={{ maxWidth: '48rem', lineHeight: 1.55 }}>
          Members, employers, and partners each have a thread with WorkforceAP. Member threads use the counselor SLA
          (&gt;48h without reply). Employer and partner threads show when their last message needs a staff reply.
        </p>
        {stats ? (
          <ul
            className="admin-super-messages-stats"
            style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', listStyle: 'none', padding: 0 }}
          >
            <li>
              <strong>{stats.threadsWithMessages}</strong> member threads with messages
            </li>
            <li>
              <strong style={{ color: 'var(--color-accent)' }}>{stats.slaBreaches48h}</strong> member SLA &gt;48h
            </li>
            <li>
              <strong>{stats.slaBreaches72h}</strong> member SLA &gt;72h
            </li>
          </ul>
        ) : null}
      </header>

      <div className="admin-super-messages-layout">
        <aside className="admin-super-messages-sidebar">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            {(['member', 'employer', 'partner', 'all'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`btn btn-sm ${inbox === tab && !alertsOnly ? 'btn-primary' : 'btn-outline'}`}
                disabled={alertsOnly && tab !== 'member'}
                onClick={() => {
                  setAlertsOnly(false);
                  setInbox(tab);
                }}
              >
                {tab === 'all' ? 'All' : tab === 'member' ? 'Members' : tab === 'employer' ? 'Employers' : 'Partners'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <label className="admin-form-hint" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              Search names, email, or message text
              <input
                type="search"
                className="admin-form-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keyword…"
                autoComplete="off"
              />
            </label>
            <label className="admin-form-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={alertsOnly}
                onChange={(e) => {
                  setAlertsOnly(e.target.checked);
                  if (e.target.checked) setInbox('member');
                }}
              />
              Only member SLA alerts (&gt;48h no counselor reply)
            </label>
            <button type="button" className="btn btn-outline btn-sm" onClick={refreshList} style={{ alignSelf: 'flex-start' }}>
              Refresh list
            </button>
          </div>

          {loading ? (
            <p className="admin-muted-text">Loading threads…</p>
          ) : threads.length === 0 ? (
            <p className="admin-muted-text">No threads match your filters.</p>
          ) : (
            <ul className="admin-super-messages-thread-list">
              {threads.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`admin-super-messages-thread-btn${selectedId === t.id ? ' is-active' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <span className="admin-super-messages-thread-title">{threadListTitle(t)}</span>
                    <span className="admin-muted-text" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                      {t.kind}
                    </span>
                    <span className="admin-muted-text" style={{ fontSize: '0.8rem' }}>
                      {threadListSubtitle(t)}
                    </span>
                    {t.lastMessagePreview ? (
                      <span className="admin-muted-text" style={{ fontSize: '0.82rem', marginTop: '0.25rem', textAlign: 'left' }}>
                        {t.lastMessagePreview}
                      </span>
                    ) : null}
                    <span className="admin-super-messages-thread-meta">
                      {t.kind === 'member' && t.sla.breached72h ? (
                        <span className="admin-super-messages-badge admin-super-messages-badge--72">&gt;72h</span>
                      ) : null}
                      {t.kind === 'member' && t.sla.breached48h && !t.sla.breached72h ? (
                        <span className="admin-super-messages-badge admin-super-messages-badge--48">&gt;48h</span>
                      ) : null}
                      {t.kind !== 'member' && t.needsStaffReply ? (
                        <span className="admin-super-messages-badge admin-super-messages-badge--48">Needs reply</span>
                      ) : null}
                      {t.lastMessageAt ? (
                        <span className="admin-muted-text" style={{ fontSize: '0.75rem' }}>
                          {new Date(t.lastMessageAt).toLocaleString()}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {cursor ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: '1rem', width: '100%' }}
              disabled={loadingMore}
              onClick={() => void loadThreads({ reset: false, appendCursor: cursor })}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : null}
        </aside>

        <section className="admin-super-messages-detail">
          {!selectedId ? (
            <p className="admin-muted-text">Select a thread to view the full history.</p>
          ) : detailLoading ? (
            <p className="admin-muted-text">Loading conversation…</p>
          ) : detail && detail.kind === 'member' ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{detail.member.fullName}</h2>
                <p className="admin-muted-text" style={{ fontSize: '0.9rem' }}>
                  {detail.member.email} · Counselor: {detail.counselorName ?? 'Not assigned'}
                </p>
                {detail.sla?.breached48h ? (
                  <p className="admin-error-banner" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                    SLA: Member message awaiting counselor reply
                    {detail.sla.breached72h ? ' (over 72 hours)' : ' (over 48 hours)'}.
                  </p>
                ) : null}

                {assignmentMsg ? (
                  <p
                    style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: assignmentMsg.type === 'ok' ? '#166534' : '#b91c1c' }}
                    role="status"
                  >
                    {assignmentMsg.text}
                  </p>
                ) : null}

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="assign-counselor" className="admin-form-hint" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                        Assign counselor
                      </label>
                      <select
                        id="assign-counselor"
                        className="admin-form-input"
                        defaultValue={detail.currentCounselorUserId ?? ''}
                        onChange={(e) => {
                          if (e.target.value) void assignCounselor(e.target.value);
                        }}
                        disabled={assigningCounselor || detail.counselors.length === 0}
                        style={{ width: '100%' }}
                      >
                        <option value="">Select counselor…</option>
                        {detail.counselors.map((c) => (
                          <option key={c.userId} value={c.userId}>
                            {c.fullName} ({c.partnerName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {detail.counselors.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>
                      Add counselors under Admin → Counselors (WorkforceAP or a partner).
                    </p>
                  ) : null}

                  <Link href={`/admin/members/${detail.member.id}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignSelf: 'flex-start' }}>
                    Open member detail page
                  </Link>
                </div>

                <p className="admin-muted-text" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                  {detail.readOnlyNote}
                </p>
              </div>
              <ul className="admin-super-messages-bubbles">
                {detail.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`admin-super-messages-bubble${m.isFromMember ? ' is-member' : ' is-staff'}`}
                  >
                    <div className="admin-super-messages-bubble-meta">
                      <strong>{m.isFromMember ? 'Member' : m.authorName}</strong>
                      <span className="admin-muted-text">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.body}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : detail && detail.kind === 'employer' ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{detail.employer.companyName}</h2>
                <p className="admin-muted-text" style={{ fontSize: '0.9rem' }}>
                  {detail.employer.contactEmail}
                </p>
                <p className="admin-muted-text" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>{detail.readOnlyNote}</p>
              </div>
              <ul className="admin-super-messages-bubbles">
                {detail.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`admin-super-messages-bubble${m.isFromPortalUser ? ' is-member' : ' is-staff'}`}
                  >
                    <div className="admin-super-messages-bubble-meta">
                      <strong>{m.isFromPortalUser ? 'Employer' : m.authorName}</strong>
                      <span className="admin-muted-text">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.body}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={sendStaffReply} style={{ marginTop: '1.25rem' }}>
                {staffErr ? (
                  <p className="admin-error-banner" role="alert" style={{ marginBottom: '0.5rem' }}>
                    {staffErr}
                  </p>
                ) : null}
                <label htmlFor="staff-reply-employer" className="admin-form-hint" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Reply as WorkforceAP
                </label>
                <textarea
                  id="staff-reply-employer"
                  className="admin-form-input"
                  rows={3}
                  value={staffDraft}
                  onChange={(e) => setStaffDraft(e.target.value)}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={staffSending || !staffDraft.trim()}>
                  {staffSending ? 'Sending…' : 'Send reply'}
                </button>
              </form>
            </>
          ) : detail && detail.kind === 'partner' ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{detail.partner.name}</h2>
                <p className="admin-muted-text" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>{detail.readOnlyNote}</p>
              </div>
              <ul className="admin-super-messages-bubbles">
                {detail.messages.map((m) => (
                  <li
                    key={m.id}
                    className={`admin-super-messages-bubble${m.isFromPortalUser ? ' is-member' : ' is-staff'}`}
                  >
                    <div className="admin-super-messages-bubble-meta">
                      <strong>{m.isFromPortalUser ? 'Partner' : m.authorName}</strong>
                      <span className="admin-muted-text">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: '0.35rem 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.body}</p>
                  </li>
                ))}
              </ul>
              <form onSubmit={sendStaffReply} style={{ marginTop: '1.25rem' }}>
                {staffErr ? (
                  <p className="admin-error-banner" role="alert" style={{ marginBottom: '0.5rem' }}>
                    {staffErr}
                  </p>
                ) : null}
                <label htmlFor="staff-reply-partner" className="admin-form-hint" style={{ display: 'block', marginBottom: '0.35rem' }}>
                  Reply as WorkforceAP
                </label>
                <textarea
                  id="staff-reply-partner"
                  className="admin-form-input"
                  rows={3}
                  value={staffDraft}
                  onChange={(e) => setStaffDraft(e.target.value)}
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={staffSending || !staffDraft.trim()}>
                  {staffSending ? 'Sending…' : 'Send reply'}
                </button>
              </form>
            </>
          ) : (
            <p className="admin-muted-text">Could not load this thread.</p>
          )}
        </section>
      </div>
    </div>
  );
}
