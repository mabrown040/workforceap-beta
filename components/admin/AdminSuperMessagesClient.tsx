'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type ThreadRow = {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  counselorUserId: string | null;
  counselorName: string | null;
  updatedAt: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastMessageAuthorId: string | null;
  sla: {
    needsCounselorReply: boolean;
    memberLastMessageAt: string | null;
    breached48h: boolean;
    breached72h: boolean;
  };
};

type ThreadDetail = {
  thread: { id: string; memberId: string; counselorUserId: string | null; updatedAt: string };
  member: { id: string; fullName: string; email: string };
  counselorName: string | null;
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

export default function AdminSuperMessagesClient() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);
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
    [alertsOnly, debouncedSearch]
  );

  useEffect(() => {
    setCursor(null);
    void loadThreads({ reset: true });
  }, [debouncedSearch, alertsOnly, loadThreads]);

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
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const r = await fetch(`/api/admin/messages/thread/${selectedId}`, { credentials: 'include' });
        if (!r.ok) throw new Error('load');
        const d = (await r.json()) as ThreadDetail;
        if (!cancelled) setDetail(d);
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

  return (
    <div className="admin-main-content admin-super-messages">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.35rem' }}>Counselor messages</h1>
        <p className="admin-muted-text" style={{ maxWidth: '48rem', lineHeight: 1.55 }}>
          Super admin read-only oversight. SLA: if a member&apos;s latest message has no counselor/staff reply after 48 hours, it
          appears as an alert. Counselors continue to reply from each member&apos;s admin page.
        </p>
        {stats ? (
          <ul className="admin-super-messages-stats" style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', listStyle: 'none', padding: 0 }}>
            <li>
              <strong>{stats.threadsWithMessages}</strong> threads with messages
            </li>
            <li>
              <strong style={{ color: 'var(--color-accent)' }}>{stats.slaBreaches48h}</strong> open &gt;48h (member waiting)
            </li>
            <li>
              <strong>{stats.slaBreaches72h}</strong> open &gt;72h
            </li>
          </ul>
        ) : null}
      </header>

      <div className="admin-super-messages-layout">
        <aside className="admin-super-messages-sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <label className="admin-form-hint" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              Search member or message text
              <input
                type="search"
                className="admin-form-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, email, or keyword…"
                autoComplete="off"
              />
            </label>
            <label className="admin-form-hint" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={alertsOnly} onChange={(e) => setAlertsOnly(e.target.checked)} />
              Only SLA alerts (&gt;48h no counselor reply)
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
                    <span className="admin-super-messages-thread-title">{t.memberName}</span>
                    <span className="admin-muted-text" style={{ fontSize: '0.8rem' }}>
                      {t.counselorName ?? 'No counselor on thread'}
                    </span>
                    {t.lastMessagePreview ? (
                      <span className="admin-muted-text" style={{ fontSize: '0.82rem', marginTop: '0.25rem', textAlign: 'left' }}>
                        {t.lastMessagePreview}
                      </span>
                    ) : null}
                    <span className="admin-super-messages-thread-meta">
                      {t.sla.breached72h ? (
                        <span className="admin-super-messages-badge admin-super-messages-badge--72">&gt;72h</span>
                      ) : null}
                      {t.sla.breached48h && !t.sla.breached72h ? (
                        <span className="admin-super-messages-badge admin-super-messages-badge--48">&gt;48h</span>
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
          ) : detail ? (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{detail.member.fullName}</h2>
                <p className="admin-muted-text" style={{ fontSize: '0.9rem' }}>
                  {detail.member.email} · Counselor: {detail.counselorName ?? '—'}
                </p>
                {detail.sla?.breached48h ? (
                  <p className="admin-error-banner" style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                    SLA: Member message awaiting counselor reply
                    {detail.sla.breached72h ? ' (over 72 hours)' : ' (over 48 hours)'}.
                  </p>
                ) : null}
                <p className="admin-muted-text" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  {detail.readOnlyNote}
                </p>
                <Link href={`/admin/members/${detail.member.id}`} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem', display: 'inline-flex' }}>
                  Open member (counselor chat)
                </Link>
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
          ) : (
            <p className="admin-muted-text">Could not load this thread.</p>
          )}
        </section>
      </div>
    </div>
  );
}
