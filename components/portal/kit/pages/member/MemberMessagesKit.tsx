'use client';

import { useCallback, useState } from 'react';
import { Circle } from 'lucide-react';
import { DesignSurface, Avatar, ChatThread, type ChatMessage } from '@/components/portal/kit';

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
}: MemberMessagesKitProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(messagesProp);
  const [error, setError] = useState<string | null>(null);

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

  const canSend = Boolean(onSend) || Boolean(memberUserId);

  return (
    <DesignSurface surface="warm">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
        <div
          className="wa-kit-card wa-grid wa-grid-cols-1 md:wa-grid-cols-3"
          style={{ padding: 0, overflow: 'hidden', minHeight: 520 }}
        >
          {/* Conversation list */}
          <div style={{ borderRight: '1px solid var(--wa-border)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--wa-border)' }}>
              <h3 style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>Messages</h3>
            </div>
            <div>
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="wa-kit-focus"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '16px 20px',
                    border: 'none',
                    borderBottom: '1px solid #f5f5f5',
                    borderLeft: c.active ? '2px solid var(--wa-accent)' : '2px solid transparent',
                    background: c.active ? 'var(--wa-accent-soft)' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <div className="wa-flex wa-items-center wa-justify-between">
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                    {c.unread ? <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--wa-accent)' }} /> : null}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--wa-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{c.role}</div>
                  <p
                    style={{
                      fontSize: 12,
                      color: c.active ? '#525252' : 'var(--wa-muted)',
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

          {/* Active thread */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
            <div className="wa-flex wa-items-center wa-gap-3" style={{ padding: '16px 20px', borderBottom: '1px solid var(--wa-border)' }}>
              <Avatar initials={activeInitials} size={36} gradient={false} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{activeName}</div>
                <div className="wa-flex wa-items-center wa-gap-1" style={{ fontSize: 10, fontWeight: 700, color: 'var(--wa-success)' }}>
                  {activeOnline ? <Circle size={6} fill="currentColor" /> : null}
                  {activeOnline ? 'Online · ' : ''}{activeRole}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column' }}>
              {error ? (
                <p role="alert" style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--wa-danger, #dc2626)' }}>
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
