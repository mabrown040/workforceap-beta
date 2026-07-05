'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Circle, MessageCircle } from 'lucide-react';
import { DesignSurface, Avatar, ChatThread, type ChatMessage } from '@/components/portal/kit';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

/**
 * Member Portal — MESSAGES view (counselor / support inbox + thread).
 * Faithful port of `data-view-panel="messages"` in
 * docs/mockups/workforceap-member-suite.html.
 *
 * Interactive (message composer) → 'use client'.
 *
 * Target route: app/(portal)/dashboard/messages
 * Surface: warm (member-facing).
 *
 * Real wiring: when `memberUserId` is supplied, the composer POSTs to the
 * existing legacy member↔counselor endpoint (`/api/member/messages`), the
 * same mechanism `MemberCounselorChatClient` uses. No new backend.
 */

interface Conversation {
  id: string;
  name: string;
  role: string;
  preview: string;
  unread?: boolean;
  active?: boolean;
}

export interface MemberMessagesKitProps {
  conversations?: Conversation[];
  /** Header for the open thread. */
  activeName?: string;
  activeRole?: string;
  activeInitials?: string;
  activeOnline?: boolean;
  messages?: ChatMessage[];
  /**
   * Optional explicit send handler. When omitted but `memberUserId` is set,
   * the composer falls back to the real `/api/member/messages` endpoint.
   * Backward compatible: callers that pass `onSend` keep their behavior.
   */
  onSend?: (text: string) => void;
  /**
   * Current member user id. When provided, the Kit becomes a real, sending
   * inbox backed by the existing counselor-thread API. Initials shown on the
   * member's own bubbles are not needed (right-aligned), so this is only used
   * to enable the live send path.
   */
  memberUserId?: string;
  /** Initials for the "other" party (counselor) on incoming bubbles. */
  otherInitials?: string;
  /**
   * Counselor thread id. When provided alongside `memberUserId`, the Kit
   * subscribes to Supabase realtime inserts on this thread so counselor
   * replies arrive live (no refresh). Mirrors `MemberCounselorChatClient`.
   */
  threadId?: string;
}

const DEFAULT_CONVERSATIONS: Conversation[] = [
  { id: 'sarah', name: 'Sarah Chen', role: 'Your Counselor', preview: "Great progress this week! Let's talk about…", unread: true, active: true },
  { id: 'team', name: 'WorkforceAP Team', role: 'Support', preview: 'Your AWS exam voucher is ready.' },
];

const DEFAULT_MESSAGES: ChatMessage[] = [
  { id: 'm1', from: 'other', author: 'SC', text: 'Hi Mike! Great progress — 78% on AWS Practitioner. How are you feeling about the Deloitte interview?' },
  { id: 'm2', from: 'self', text: 'A little nervous about the technical questions honestly.' },
  {
    id: 'm3',
    from: 'other',
    author: 'SC',
    text: "Totally normal. Let's do a mock interview Thursday. I'll also flag the Interview Prep tool in your Career Toolkit — it's tuned for Salesforce admin roles.",
  },
];

export function MemberMessagesKit({
  conversations = DEFAULT_CONVERSATIONS,
  activeName = 'Sarah Chen',
  activeRole = 'Career Counselor',
  activeInitials = 'SC',
  activeOnline = true,
  messages: messagesProp = DEFAULT_MESSAGES,
  onSend,
  memberUserId,
  otherInitials = activeInitials,
  threadId,
}: MemberMessagesKitProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(messagesProp);
  const [error, setError] = useState<string | null>(null);
  // Mobile single-pane navigation: on phones the list and thread cannot sit
  // side-by-side, so we show one pane at a time with a back button. Desktop
  // (md+) ignores this and keeps the two-pane layout via CSS. Default to the
  // open thread so members land on the active conversation.
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('thread');
  // Keep latest "other" initials available to the realtime callback without
  // re-subscribing when they change.
  const otherInitialsRef = useRef(otherInitials);
  otherInitialsRef.current = otherInitials;

  // Live send path: reuse the existing legacy endpoint that
  // MemberCounselorChatClient posts to. Only active when a real member id is
  // present and no explicit onSend override was passed.
  const sendLive = useCallback(
    async (text: string) => {
      setError(null);
      // Optimistic append so the thread feels responsive; reconcile on response.
      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [...prev, { id: tempId, from: 'self', text }]);
      try {
        const r = await fetch('/api/member/messages', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });
        const data = (await r.json().catch(() => ({}))) as {
          error?: string;
          message?: { id: string; body: string };
        };
        if (!r.ok || !data.message) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setError(typeof data.error === 'string' ? data.error : 'Send failed');
          return;
        }
        const saved = data.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { id: saved.id, from: 'self', text: saved.body } : m)),
        );
        try {
          window.dispatchEvent(new CustomEvent('wa-nav-badges-refresh'));
        } catch {
          /* ignore */
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError('Network error');
      }
    },
    [],
  );

  const handleSend = useCallback(
    (text: string) => {
      if (onSend) {
        onSend(text);
        return;
      }
      if (memberUserId) {
        void sendLive(text);
      }
    },
    [onSend, memberUserId, sendLive],
  );

  // Live RECEIVE path: mirror MemberCounselorChatClient's realtime subscription
  // so counselor replies appear without a refresh. Gated on a real member id +
  // thread id; fails soft (current behavior preserved) if realtime is
  // unavailable or the env client cannot be created.
  useEffect(() => {
    if (!memberUserId || !threadId) return undefined;
    let cancelled = false;
    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`member-thread:${threadId}:kit`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as Record<string, unknown>;
            const id = String(row.id ?? '');
            const authorId = String(row.author_id ?? '');
            const body = String(row.body ?? '');
            if (!id) return;
            const mine = authorId === memberUserId;
            setMessages((prev) => {
              // Dedupe against optimistic/sent (and already-received) messages by id.
              if (prev.some((m) => m.id === id)) return prev;
              const incoming: ChatMessage = mine
                ? { id, from: 'self', text: body }
                : { id, from: 'other', text: body, author: otherInitialsRef.current };
              return [...prev, incoming];
            });
            // Counselor reply arrived — refresh the nav unread badge.
            if (!mine) {
              try {
                window.dispatchEvent(new CustomEvent('wa-nav-badges-refresh'));
              } catch {
                /* ignore */
              }
            }
          },
        )
        .subscribe();

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[MemberMessagesKit] Realtime unavailable', e);
      return undefined;
    }
  }, [memberUserId, threadId]);

  const canSend = Boolean(onSend) || Boolean(memberUserId);

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }} className="wa-space-y-6">
        {/* Page opener — eyebrow + title, matching the VoiceStudioKit idiom,
            so the tab reads as an intentional page rather than a floating
            widget. */}
        <div>
          <div
            className="wa-flex wa-items-center wa-gap-2"
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--wa-accent)', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            <MessageCircle size={13} aria-hidden="true" />
            <span>Inbox</span>
          </div>
          <h1 className="h-font" style={{ fontSize: 'clamp(22px, 6vw, 30px)', fontWeight: 800, letterSpacing: '-0.03em', marginTop: 4, textWrap: 'balance' }}>
            Messages
          </h1>
          <p style={{ fontSize: 14, color: 'var(--wa-muted)', marginTop: 4 }}>
            Reach your counselor and the WorkforceAP support team in one place.
          </p>
        </div>
        <div
          className="wa-kit-card wa-grid wa-grid-cols-1 md:wa-grid-cols-3"
          style={{ padding: 0, overflow: 'hidden', minHeight: 520 }}
        >
          {/* Conversation list — single pane on mobile (hidden when a thread is
              open), always visible alongside the thread on md+. */}
          <div
            className={`${mobileView === 'list' ? 'wa-block' : 'wa-hidden'} md:wa-block`}
            style={{ borderRight: '1px solid var(--wa-border)' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--wa-border)' }}>
              <h2 style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>Conversations</h2>
            </div>
            <div>
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMobileView('thread')}
                  className={`wa-kit-focus wa-transition-colors wa-duration-150 motion-reduce:wa-transition-none${c.active ? '' : ' hover:wa-bg-[var(--wa-bg)]'}`}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid var(--wa-border)',
                    borderLeft: c.active ? '2px solid var(--wa-accent)' : '2px solid transparent',
                    background: c.active ? 'var(--wa-accent-soft)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div className="wa-flex wa-items-center wa-justify-between">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                    {c.unread ? (
                      <span className="wa-flex wa-items-center wa-gap-1">
                        <span className="sr-only">Unread</span>
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--wa-accent)' }} />
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--wa-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.role}</div>
                  <p
                    style={{
                      fontSize: 12,
                      color: c.active ? 'var(--wa-text)' : 'var(--wa-muted)',
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.preview}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Active thread — single pane on mobile (hidden when the list is
              open), always visible beside the list on md+. Display is driven by
              classes (not inline) so the mobile hide/show can win over flex. */}
          <div
            className={`${mobileView === 'thread' ? 'wa-flex' : 'wa-hidden'} md:wa-flex md:wa-col-span-2`}
            style={{ flexDirection: 'column' }}
          >
            <div className="wa-flex wa-items-center wa-gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid var(--wa-border)' }}>
              {/* Mobile-only back button → return to the conversation list. */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                aria-label="Back to messages"
                className="wa-kit-focus hover:wa-bg-[var(--wa-bg)] active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[background-color,transform] wa-duration-150 motion-reduce:wa-transition-none wa-flex wa-items-center wa-justify-center md:wa-hidden"
                style={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  marginLeft: -4,
                  borderRadius: 999,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--wa-text)',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <Avatar initials={activeInitials} size={36} gradient={false} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeName}</div>
                <div className="wa-flex wa-items-center wa-gap-1" style={{ fontSize: 10, fontWeight: 700, color: 'var(--wa-success)' }}>
                  {activeOnline ? <Circle size={6} fill="currentColor" aria-hidden="true" /> : null}
                  {activeOnline ? 'Online · ' : ''}{activeRole}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
              {error ? (
                <p role="alert" style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--wa-danger)' }}>
                  {error}
                </p>
              ) : null}
              <ChatThread
                messages={messages}
                placeholder={`Message ${activeName.split(' ')[0]}…`}
                onSend={canSend ? handleSend : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </DesignSurface>
  );
}
