'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

// ── Types ────────────────────────────────────────────────────────────────────

type ThreadDto = {
  id: string;
  memberId: string | null;
  counselorUserId: string | null;
  memberLastReadAt: string | null;
  counselorLastReadAt: string | null;
};

type MessageDto = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

type InitialPayload = {
  thread: ThreadDto;
  counselorName: string | null;
  counselorInitials: string;
  messages: MessageDto[];
  memberUserId: string;
  lastMsgText: string;
  lastMsgTime: string;
  unreadCount: number;
};

// ── Career Tip Card ───────────────────────────────────────────────────────────

function CareerTipCard() {
  return (
    <div style={{ marginTop: '2rem', marginLeft: '1rem', marginRight: '1rem', marginBottom: '1rem' }}>
      <div
        style={{
          borderRadius: '16px', padding: '1.5rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' as const,
          background: 'linear-gradient(135deg, #ad2c4d, #8c0f37)',
        }}
      >
        <div
          style={{
            width: '64px', height: '64px', borderRadius: '9999px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
            background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)',
          }}
        >
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '30px' }}>tips_and_updates</span>
        </div>
        <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '4px', margin: '0 0 4px' }}>Career Tip</h4>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', lineHeight: 1.6, margin: 0 }}>
          Responding to your counselor within 24 hours increases your placement rate by 30%.
        </p>
      </div>
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────

export default function MemberMessagesMobileClient({ initial }: { initial: InitialPayload }) {
  const {
    memberUserId,
    counselorName,
    counselorInitials,
    lastMsgText,
    lastMsgTime,
    unreadCount: initialUnread,
  } = initial;

  const [thread, setThread] = useState(initial.thread);
  const [messages, setMessages] = useState<MessageDto[]>(initial.messages);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const markRead = useCallback(async () => {
    try {
      const r = await fetch('/api/member/messages', { method: 'PATCH', credentials: 'include' });
      if (r.ok) {
        const d = (await r.json()) as { memberLastReadAt?: string };
        if (d.memberLastReadAt) {
          setThread((t) => ({ ...t, memberLastReadAt: d.memberLastReadAt! }));
          setUnreadCount(0);
        }
        try { window.dispatchEvent(new CustomEvent('wa-nav-badges-refresh')); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (view === 'thread') {
      scrollToBottom();
      void markRead();
    }
  }, [view, messages.length, scrollToBottom, markRead]);

  // Realtime subscription
  const threadId = thread.id;
  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`member-thread:${threadId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}`,
        }, (payload) => {
          if (cancelled) return;
          const row = payload.new as Record<string, unknown>;
          const id = String(row.id ?? '');
          const authorId = String(row.author_id ?? '');
          const body = String(row.body ?? '');
          const createdAt = row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString();
          if (!id) return;
          setMessages((prev) => prev.some((m) => m.id === id) ? prev : [...prev, { id, threadId, authorId, body, createdAt }]);
          if (authorId !== memberUserId) setUnreadCount((c) => c + 1);
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'message_threads', filter: `id=eq.${threadId}`,
        }, (payload) => {
          if (cancelled) return;
          const row = payload.new as Record<string, unknown>;
          setThread((t) => ({
            ...t,
            counselorUserId: row.counselor_user_id != null ? String(row.counselor_user_id) : t.counselorUserId,
            memberLastReadAt: row.member_last_read_at != null ? new Date(String(row.member_last_read_at)).toISOString() : t.memberLastReadAt,
            counselorLastReadAt: row.counselor_last_read_at != null ? new Date(String(row.counselor_last_read_at)).toISOString() : t.counselorLastReadAt,
          }));
        })
        .subscribe();
      return () => { cancelled = true; void supabase.removeChannel(channel); };
    } catch (e) {
      console.warn('[MemberMessages] Realtime unavailable', e);
      return undefined;
    }
  }, [threadId, memberUserId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch('/api/member/messages', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Send failed');
        return;
      }
      const msg = data.message as MessageDto | undefined;
      if (msg) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      }
      setDraft('');
      try { window.dispatchEvent(new CustomEvent('wa-nav-badges-refresh')); } catch { /* ignore */ }
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  };

  // ── Conversation List View ──────────────────────────────────────────────────
  if (view === 'list') {
    const displayLastMsg = messages.length > 0
      ? (messages[messages.length - 1].body ?? '').slice(0, 60)
      : lastMsgText;
    const displayLastTime = messages.length > 0
      ? new Date(messages[messages.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : lastMsgTime;

    const q = searchQuery.trim().toLowerCase();
    const rowMatches = (title: string, preview: string) => {
      if (!q) return true;
      return `${title} ${preview}`.toLowerCase().includes(q);
    };
    const showCounselor = rowMatches(counselorName ?? 'Counselor', displayLastMsg);
    const showProgram = rowMatches('Program Team', 'Your certification for Digital Literacy is ready.');
    const showCareer = rowMatches('Career Services', 'New job match found: Junior Web Developer.');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fcf9f8' }}>
        {/* Header */}
        <header
          style={{
            position: 'sticky', top: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', width: '100%',
            background: 'rgba(252,249,248,0.92)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(173,44,77,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link href="/dashboard" style={{ color: '#ad2c4d', padding: '6px', borderRadius: '9999px', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
            </Link>
            <h1 style={{ color: '#1c1b1b', fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em', margin: 0 }}>Messages</h1>
          </div>
          <button
            type="button"
            style={{ color: '#ad2c4d', padding: '6px', borderRadius: '9999px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
            aria-label="New message"
            onClick={() => searchInputRef.current?.focus()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_square</span>
          </button>
        </header>

        {/* Search */}
        <div style={{ padding: '0.5rem 1rem' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(88,65,68,0.5)', fontSize: '16px' }}>search</span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              style={{ width: '100%', paddingLeft: '40px', paddingRight: '12px', paddingTop: '10px', paddingBottom: '10px', borderRadius: '12px', fontSize: '14px', background: '#f0edec', border: 'none', outline: 'none', color: '#1c1b1b' }}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Thread list */}
        <main style={{ flex: 1, paddingBottom: '6rem', overflowY: 'auto' }}>
          <div style={{ padding: '4px 8px 0' }}>
            {/* Counselor thread — active/unread */}
            {showCounselor && (
            <div style={{ padding: '2px 8px' }}>
              <button
                type="button"
                onClick={() => setView('thread')}
                style={{
                  width: '100%', borderRadius: '12px', padding: '12px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  cursor: 'pointer', textAlign: 'left' as const,
                  background: 'rgba(173,44,77,0.04)', border: 'none',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '44px', height: '44px', borderRadius: '9999px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 700, fontSize: '12px',
                      background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)',
                    }}
                  >
                    {counselorInitials}
                  </div>
                  <div
                    style={{
                      position: 'absolute', bottom: '-2px', right: '-2px',
                      width: '12px', height: '12px', borderRadius: '9999px',
                      border: '2px solid #fcf9f8', background: '#22c55e',
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '14px', color: '#1c1b1b', margin: 0 }}>
                      {counselorName ?? 'Your Counselor'}
                    </h3>
                    {displayLastTime && (
                      <span style={{ fontSize: '11px', color: 'rgba(88,65,68,0.6)' }}>
                        {displayLastTime}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <p style={{ fontSize: '13px', color: '#584144', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayLastMsg || 'Tap to start chatting'}</p>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          flexShrink: 0, color: '#fff', fontSize: '10px', fontWeight: 700,
                          height: '20px', minWidth: '20px', padding: '0 4px',
                          borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: '#ad2c4d',
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>
            )}

            {/* Program team — link to resources */}
            {showProgram && (
            <div style={{ padding: '2px 8px' }}>
              <Link
                href="/dashboard/resources"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  borderRadius: '12px', padding: '12px',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#584144', fontWeight: 700, fontSize: '12px', flexShrink: 0,
                    background: '#e5e2e1',
                  }}
                >
                  PT
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '14px', color: '#1c1b1b', margin: 0 }}>Program Team</h3>
                    <span style={{ fontSize: '11px', color: 'rgba(88,65,68,0.6)' }}>Yesterday</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#584144', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Your certification for Digital Literacy is ready.</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'rgba(88,65,68,0.4)', fontSize: '18px', flexShrink: 0 }}>chevron_right</span>
              </Link>
            </div>
            )}

            {/* Career Services — link to job board */}
            {showCareer && (
            <div style={{ padding: '2px 8px' }}>
              <Link
                href="/dashboard/jobs"
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  borderRadius: '12px', padding: '12px',
                  textDecoration: 'none', color: 'inherit',
                }}
              >
                <div
                  style={{
                    width: '44px', height: '44px', borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#584144', fontWeight: 700, fontSize: '12px', flexShrink: 0,
                    background: '#e5e2e1',
                  }}
                >
                  CS
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '14px', color: '#1c1b1b', margin: 0 }}>Career Services</h3>
                    <span style={{ fontSize: '11px', color: 'rgba(88,65,68,0.6)' }}>Monday</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#584144', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>New job match found: Junior Web Developer.</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'rgba(88,65,68,0.4)', fontSize: '18px', flexShrink: 0 }}>chevron_right</span>
              </Link>
            </div>
            )}

            <CareerTipCard />
          </div>
        </main>
      </div>
    );
  }

  // ── Thread / Chat View ──────────────────────────────────────────────────────
  return (
    <div
      className="md:wa-hidden wa-flex wa-flex-col"
      style={{ height: '100dvh', background: '#fcf9f8', overflow: 'hidden' }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 z-50"
        style={{ background: 'rgba(252,249,248,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(173,44,77,0.08)' }}
      >
        <button
          type="button"
          onClick={() => setView('list')}
          className="text-[#ad2c4d] p-1 rounded-full hover:bg-[#f2eeed] active:scale-95 transition-transform"
          aria-label="Back to messages"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ background: '#ad2c4d' }}
        >
          {counselorInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#1c1b1b] text-sm leading-tight truncate">
            {counselorName ?? 'Your Counselor'}
          </p>
          {thread.counselorUserId && (
            <p className="text-[11px] text-[#584144] opacity-70">WorkforceAP Counselor</p>
          )}
        </div>
      </header>

      {/* Message scroll area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: '#f2eeed' }}
            >
              <span className="material-symbols-outlined text-[#8c0f37] text-2xl">chat_bubble_outline</span>
            </div>
            <p className="text-[#584144] text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.authorId === memberUserId;
            const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <div
                key={m.id}
                className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className="max-w-[78%] px-4 py-2.5 text-sm leading-snug"
                  style={
                    mine
                      ? { background: '#8c0f37', color: '#fff', borderRadius: '18px 18px 4px 18px' }
                      : { background: '#f0edec', color: '#1c1b1b', borderRadius: '18px 18px 18px 4px' }
                  }
                >
                  {m.body}
                </div>
                <time className="text-[10px] text-[#584144] opacity-60 mt-1 px-1">
                  {timeStr}
                </time>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg text-xs text-white" style={{ background: '#ba1a1a' }}>
          {error}
        </div>
      )}

      {/* Compose input — pinned at bottom */}
      <form
        onSubmit={send}
        className="flex-shrink-0 flex items-end gap-2 px-3 py-3"
        style={{
          background: 'rgba(252,249,248,0.95)',
          borderTop: '1px solid rgba(173,44,77,0.08)',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(e as unknown as React.FormEvent);
            }
          }}
          placeholder="Type a message…"
          maxLength={8000}
          rows={1}
          className="flex-1 resize-none px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8c0f37]/40 placeholder:text-[#584144]/50"
          style={{ background: '#f0edec', border: 'none', maxHeight: '8rem', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{
            background: draft.trim() ? '#8c0f37' : '#e5e2e1',
            color: draft.trim() ? '#fff' : '#584144',
          }}
          aria-label="Send message"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </div>
  );
}
