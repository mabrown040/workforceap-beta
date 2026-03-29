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
      className="wa-fixed wa-bottom-0 wa-left-0 wa-w-full wa-z-50 wa-flex wa-justify-around wa-items-center wa-px-4 md:wa-hidden"
      style={{
        height: '5rem',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid color-mix(in srgb, var(--color-accent) 10%, transparent)',
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
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl min-w-[56px] active:scale-90 transition-all duration-150"
            style={
              isActive
                ? { color: 'var(--color-accent)', background: 'color-mix(in srgb, var(--color-accent) 7%, transparent)' }
                : { color: 'var(--color-on-surface-variant)', opacity: 0.7 }
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
    <div className="mt-8 mx-4 mb-4">
      <div
        className="rounded-2xl p-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))' }}
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
      <div className="md:wa-hidden wa-flex wa-flex-col wa-min-h-screen" style={{ background: 'var(--color-background-dark)' }}>
        {/* Header */}
        <header
          className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 w-full"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-1 rounded-full active:scale-95 transition-transform" style={{ color: 'var(--color-accent)' }}>
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-bold text-xl tracking-tight" style={{ color: 'var(--color-accent)' }}>Messages</h1>
          </div>
          <button
            className="p-1 rounded-full active:scale-95 transition-transform"
            style={{ color: 'var(--color-accent)' }}
            aria-label="New message"
          >
            <span className="material-symbols-outlined">edit_square</span>
          </button>
        </header>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>search</span>
            <input
              type="text"
              placeholder="Search conversations"
              className="w-full pl-10 pr-3 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: 'var(--surface-container-high)', border: 'none', color: 'var(--color-on-surface)' }}
              readOnly
            />
          </div>
        </div>

        {/* Thread list */}
        <main className="flex-1 pb-24 overflow-y-auto">
          <div className="space-y-1">
            {/* Counselor thread — active/unread */}
            <div className="px-4 py-1">
              <button
                type="button"
                onClick={() => setView('thread')}
                className="w-full rounded-xl px-4 py-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform text-left"
                style={{ background: 'var(--surface-container-high)' }}
              >
                <div className="relative flex-shrink-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm tracking-tight"
                    style={{ background: 'var(--color-accent)' }}
                  >
                    {counselorInitials}
                  </div>
                  {/* Online dot */}
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                    style={{ background: 'var(--color-gold)', borderColor: 'var(--surface-container-high)' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-[15px]" style={{ color: 'var(--color-on-surface)' }}>
                      {counselorName ?? 'Your Counselor'}
                    </h3>
                    {displayLastTime && (
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--color-accent-dark, var(--color-accent))' }}>
                        {displayLastTime}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-on-surface)' }}>{displayLastMsg || 'Tap to start chatting'}</p>
                    {unreadCount > 0 && (
                      <span
                        className="flex-shrink-0 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Program team placeholder */}
            <div className="px-4 py-1">
              <div
                className="rounded-xl px-4 py-4 flex items-center gap-4"
                style={{ background: 'var(--surface-container-low)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'var(--surface-container-highest)', color: 'var(--color-on-surface-variant)' }}
                >
                  PT
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-[15px]" style={{ color: 'var(--color-on-surface)' }}>Program Team</h3>
                    <span className="text-[11px] opacity-60" style={{ color: 'var(--color-on-surface-variant)' }}>Yesterday</span>
                  </div>
                  <p className="text-sm truncate" style={{ color: 'var(--color-on-surface-variant)' }}>Your certification for Digital Literacy is ready.</p>
                </div>
              </div>
            </div>

            {/* Career Services placeholder */}
            <div className="px-4 py-1">
              <div
                className="rounded-xl px-4 py-4 flex items-center gap-4"
                style={{ background: 'var(--surface-container-low)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: 'var(--surface-container-highest)', color: 'var(--color-on-surface-variant)' }}
                >
                  CS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-[15px]" style={{ color: 'var(--color-on-surface)' }}>Career Services</h3>
                    <span className="text-[11px] opacity-60" style={{ color: 'var(--color-on-surface-variant)' }}>Monday</span>
                  </div>
                  <p className="text-sm truncate" style={{ color: 'var(--color-on-surface-variant)' }}>New job match found: Junior Web Developer.</p>
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
      className="md:wa-hidden wa-flex wa-flex-col"
      style={{ height: '100dvh', background: 'var(--color-background-dark)', overflow: 'hidden' }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-4 py-3 z-50"
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid color-mix(in srgb, var(--color-accent) 8%, transparent)' }}
      >
        <button
          type="button"
          onClick={() => setView('list')}
          className="p-1 rounded-full active:scale-95 transition-transform"
          style={{ color: 'var(--color-accent)' }}
          aria-label="Back to messages"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ background: 'var(--color-accent)' }}
        >
          {counselorInitials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-tight truncate" style={{ color: 'var(--color-on-surface)' }}>
            {counselorName ?? 'Your Counselor'}
          </p>
          {thread.counselorUserId && (
            <p className="text-[11px] opacity-70" style={{ color: 'var(--color-on-surface-variant)' }}>WorkforceAP Counselor</p>
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
              style={{ background: 'var(--surface-container-high)' }}
            >
              <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-accent-dark, var(--color-accent))' }}>chat_bubble_outline</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>No messages yet. Say hello!</p>
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
                      ? { background: 'var(--color-accent-dark, var(--color-accent))', color: '#fff', borderRadius: '18px 18px 4px 18px' }
                      : { background: 'var(--surface-container)', color: 'var(--color-on-surface)', borderRadius: '18px 18px 18px 4px' }
                  }
                >
                  {m.body}
                </div>
                <time className="text-[10px] opacity-60 mt-1 px-1" style={{ color: 'var(--color-on-surface-variant)' }}>
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
        <div className="flex-shrink-0 mx-4 mb-2 px-3 py-2 rounded-lg text-xs text-white" style={{ background: 'var(--color-error, #ba1a1a)' }}>
          {error}
        </div>
      )}

      {/* Compose input — pinned at bottom */}
      <form
        onSubmit={send}
        className="flex-shrink-0 flex items-end gap-2 px-3 py-3"
        style={{
          background: 'var(--glass-bg)',
          borderTop: '1px solid color-mix(in srgb, var(--color-accent) 8%, transparent)',
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
          className="flex-1 resize-none px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2"
          style={{ background: 'var(--surface-container)', border: 'none', color: 'var(--color-on-surface)', maxHeight: '8rem', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all"
          style={{
            background: draft.trim() ? 'var(--color-accent-dark, var(--color-accent))' : 'var(--surface-container-high)',
            color: draft.trim() ? '#fff' : 'var(--color-on-surface-variant)',
          }}
          aria-label="Send message"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </div>
  );
}
