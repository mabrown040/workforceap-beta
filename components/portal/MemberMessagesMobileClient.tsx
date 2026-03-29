'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

// ── Portal Bottom Nav ─────────────────────────────────────────────────────────

const PORTAL_NAV = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/dashboard/messages', label: 'Messages', icon: 'chat_bubble' },
  { href: '/dashboard/learning', label: 'Resources', icon: 'menu_book' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'person' },
];

function PortalBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="wa-md:hidden"
      style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%', zIndex: 50,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '0 1rem',
        height: '5rem',
        background: 'rgba(252,249,248,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(173,44,77,0.1)',
        boxShadow: '0 -4px 24px rgba(28,27,27,0.04)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {PORTAL_NAV.map(({ href, label, icon }) => {
        const isActive = href === '/dashboard'
          ? pathname === '/dashboard'
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="active:scale-90 transition-all duration-150"
            style={
              isActive
                ? { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.125rem', padding: '0.25rem 0.75rem', borderRadius: '0.75rem', minWidth: '56px', color: '#ad2c4d', background: 'rgba(173,44,77,0.07)' }
                : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.125rem', padding: '0.25rem 0.75rem', borderRadius: '0.75rem', minWidth: '56px', color: '#584144', opacity: 0.7 }
            }
          >
            <span
              className="material-symbols-outlined text-[22px] leading-none mb-1"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {icon}
            </span>
            <span className="font-bold uppercase tracking-[0.05em] leading-none" style={{ fontSize: '0.6875rem' }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Career Tip Card ───────────────────────────────────────────────────────────

function CareerTipCard() {
  return (
    <div style={{ marginTop: '2rem', margin: '2rem 1rem 1rem' }}>
      <div
        style={{ borderRadius: '1rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(135deg, #ad2c4d, #8c0f37)' }}
      >
        <div
          style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
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

    return (
      <div className="wa-md:hidden" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#fcf9f8' }}>
        {/* Header */}
        <header
          style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', width: '100%', background: 'rgba(252,249,248,0.88)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/dashboard" className="text-[#ad2c4d] active:scale-95 transition-transform" style={{ padding: '0.25rem', borderRadius: '9999px' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="text-[#ad2c4d] font-bold text-xl tracking-tight">Messages</h1>
          </div>
          <button
            className="text-[#ad2c4d] active:scale-95 transition-transform"
            style={{ padding: '0.25rem', borderRadius: '9999px' }}
            aria-label="New message"
          >
            <span className="material-symbols-outlined">edit_square</span>
          </button>
        </header>

        {/* Search */}
        <div style={{ padding: '1rem 1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined text-[#584144] text-sm" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>search</span>
            <input
              type="text"
              placeholder="Search conversations"
              className="text-sm focus:outline-none focus:ring-2 focus:ring-[#8c0f37]/40 placeholder:text-[#584144]/60"
              style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '0.75rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', borderRadius: '0.75rem', background: '#ebe7e7', border: 'none' }}
              readOnly
            />
          </div>
        </div>

        {/* Thread list */}
        <main style={{ flex: 1, paddingBottom: '6rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {/* Counselor thread — active/unread */}
            <div style={{ padding: '0.25rem 1rem' }}>
              <button
                type="button"
                onClick={() => setView('thread')}
                className="active:scale-[0.98] transition-transform"
                style={{ width: '100%', background: '#f2eeed', borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', textAlign: 'left' }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div
                    className="font-bold text-sm tracking-tight"
                    style={{ width: '3rem', height: '3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#ad2c4d' }}
                  >
                    {counselorInitials}
                  </div>
                  {/* Online dot */}
                  <div
                    style={{ position: 'absolute', bottom: 0, right: 0, width: '0.75rem', height: '0.75rem', borderRadius: '9999px', border: '2px solid #f2eeed', background: '#7b5800' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.125rem' }}>
                    <h3 className="font-bold text-[15px] text-[#1c1b1b]">
                      {counselorName ?? 'Your Counselor'}
                    </h3>
                    {displayLastTime && (
                      <span className="text-[11px] font-medium text-[#8c0f37] uppercase tracking-wider">
                        {displayLastTime}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <p className="text-sm text-[#1c1b1b] font-medium truncate">{displayLastMsg || 'Tap to start chatting'}</p>
                    {unreadCount > 0 && (
                      <span
                        className="font-bold text-[10px]"
                        style={{ flexShrink: 0, color: '#fff', height: '1.25rem', width: '1.25rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ad2c4d' }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Program team placeholder */}
            <div style={{ padding: '0.25rem 1rem' }}>
              <div
                style={{ borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fcf9f8' }}
              >
                <div
                  className="font-bold text-sm"
                  style={{ width: '3rem', height: '3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#584144', flexShrink: 0, background: '#e5e2e1' }}
                >
                  PT
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.125rem' }}>
                    <h3 className="font-bold text-[15px] text-[#1c1b1b]">Program Team</h3>
                    <span className="text-[11px] text-[#584144] opacity-60">Yesterday</span>
                  </div>
                  <p className="text-sm text-[#584144] truncate">Your certification for Digital Literacy is ready.</p>
                </div>
              </div>
            </div>

            {/* Career Services placeholder */}
            <div style={{ padding: '0.25rem 1rem' }}>
              <div
                style={{ borderRadius: '0.75rem', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', background: '#fcf9f8' }}
              >
                <div
                  className="font-bold text-sm"
                  style={{ width: '3rem', height: '3rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#584144', flexShrink: 0, background: '#e5e2e1' }}
                >
                  CS
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.125rem' }}>
                    <h3 className="font-bold text-[15px] text-[#1c1b1b]">Career Services</h3>
                    <span className="text-[11px] text-[#584144] opacity-60">Monday</span>
                  </div>
                  <p className="text-sm text-[#584144] truncate">New job match found: Junior Web Developer.</p>
                </div>
              </div>
            </div>

            <CareerTipCard />
          </div>
        </main>

        <PortalBottomNav />
      </div>
    );
  }

  // ── Thread / Chat View ──────────────────────────────────────────────────────
  return (
    <div
      className="wa-md:hidden"
      style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#fcf9f8', overflow: 'hidden' }}
    >
      {/* Header */}
      <header
        style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', zIndex: 50, background: 'rgba(252,249,248,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(173,44,77,0.08)' }}
      >
        <button
          type="button"
          onClick={() => setView('list')}
          className="text-[#ad2c4d] active:scale-95 transition-transform"
          style={{ padding: '0.25rem', borderRadius: '9999px' }}
          aria-label="Back to messages"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div
          className="font-bold text-xs"
          style={{ width: '2.25rem', height: '2.25rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, background: '#ad2c4d' }}
        >
          {counselorInitials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '0.75rem', textAlign: 'center' }}>
            <div
              style={{ width: '4rem', height: '4rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f2eeed' }}
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
                style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}
              >
                <div
                  className="text-sm leading-snug"
                  style={
                    mine
                      ? { maxWidth: '78%', padding: '0.625rem 1rem', background: '#8c0f37', color: '#fff', borderRadius: '18px 18px 4px 18px' }
                      : { maxWidth: '78%', padding: '0.625rem 1rem', background: '#f0edec', color: '#1c1b1b', borderRadius: '18px 18px 18px 4px' }
                  }
                >
                  {m.body}
                </div>
                <time className="text-[10px] text-[#584144] opacity-60" style={{ marginTop: '0.25rem', padding: '0 0.25rem' }}>
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
        <div className="text-xs" style={{ flexShrink: 0, margin: '0 1rem 0.5rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', color: '#fff', background: '#ba1a1a' }}>
          {error}
        </div>
      )}

      {/* Compose input — pinned at bottom */}
      <form
        onSubmit={send}
        style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: '0.5rem', padding: '0.75rem',
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
          className="text-sm focus:outline-none focus:ring-2 focus:ring-[#8c0f37]/40 placeholder:text-[#584144]/50"
          style={{ flex: 1, resize: 'none', padding: '0.75rem 1rem', borderRadius: '1rem', background: '#f0edec', border: 'none', maxHeight: '8rem', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="active:scale-95 transition-all"
          style={{ flexShrink: 0, width: '2.5rem', height: '2.5rem', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
