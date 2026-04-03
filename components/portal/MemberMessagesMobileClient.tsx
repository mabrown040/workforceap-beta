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
    <div className="mt-8 mx-4 mb-4">
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, #ad2c4d, #8c0f37)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
        >
          <span className="material-symbols-outlined text-white text-3xl">tips_and_updates</span>
        </div>
        <h4 className="text-white font-bold mb-1">Career Tip</h4>
        <p className="text-white/80 text-xs leading-relaxed">
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
      <div className="md:wa-hidden wa-flex wa-flex-col wa-min-h-screen" style={{ background: '#fcf9f8' }}>
        {/* Header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 w-full"
          style={{ background: 'rgba(252,249,248,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(173,44,77,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[#ad2c4d] p-1.5 rounded-full hover:bg-[#f2eeed] active:scale-95 transition-transform">
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </Link>
            <h1 className="text-[#1c1b1b] font-bold text-lg tracking-tight">Messages</h1>
          </div>
          <button
            type="button"
            className="text-[#ad2c4d] p-1.5 rounded-full hover:bg-[#f2eeed] active:scale-95 transition-transform"
            aria-label="New message"
            onClick={() => searchInputRef.current?.focus()}
          >
            <span className="material-symbols-outlined text-[20px]">edit_square</span>
          </button>
        </header>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#584144]/50 text-[16px]">search</span>
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#8c0f37]/30 placeholder:text-[#584144]/40"
              style={{ background: '#f0edec', border: 'none' }}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Thread list */}
        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="px-2 pt-1">
            {/* Counselor thread — active/unread */}
            {showCounselor && (
            <div className="px-2 py-0.5">
              <button
                type="button"
                onClick={() => setView('thread')}
                className="w-full rounded-xl px-3 py-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform text-left"
                style={{ background: 'rgba(173,44,77,0.04)' }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: 'linear-gradient(135deg, #8c0f37, #ad2c4d)' }}
                  >
                    {counselorInitials}
                  </div>
                  <div
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: '#22c55e', borderColor: '#fcf9f8' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-[14px] text-[#1c1b1b]">
                      {counselorName ?? 'Your Counselor'}
                    </h3>
                    {displayLastTime && (
                      <span className="text-[11px] text-[#584144]/60">
                        {displayLastTime}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2 mt-0.5">
                    <p className="text-[13px] text-[#584144] truncate">{displayLastMsg || 'Tap to start chatting'}</p>
                    {unreadCount > 0 && (
                      <span
                        className="flex-shrink-0 text-white text-[10px] font-bold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center"
                        style={{ background: '#ad2c4d' }}
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
            <div className="px-2 py-0.5">
              <Link
                href="/dashboard/resources"
                className="block rounded-xl px-3 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[#584144] font-bold text-xs flex-shrink-0"
                  style={{ background: '#e5e2e1' }}
                >
                  PT
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-[14px] text-[#1c1b1b]">Program Team</h3>
                    <span className="text-[11px] text-[#584144]/60">Yesterday</span>
                  </div>
                  <p className="text-[13px] text-[#584144] truncate mt-0.5">Your certification for Digital Literacy is ready.</p>
                </div>
                <span className="material-symbols-outlined text-[#584144]/40 text-lg flex-shrink-0">chevron_right</span>
              </Link>
            </div>
            )}

            {/* Career Services — link to job board */}
            {showCareer && (
            <div className="px-2 py-0.5">
              <Link
                href="/dashboard/jobs"
                className="block rounded-xl px-3 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-[#584144] font-bold text-xs flex-shrink-0"
                  style={{ background: '#e5e2e1' }}
                >
                  CS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-semibold text-[14px] text-[#1c1b1b]">Career Services</h3>
                    <span className="text-[11px] text-[#584144]/60">Monday</span>
                  </div>
                  <p className="text-[13px] text-[#584144] truncate mt-0.5">New job match found: Junior Web Developer.</p>
                </div>
                <span className="material-symbols-outlined text-[#584144]/40 text-lg flex-shrink-0">chevron_right</span>
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
