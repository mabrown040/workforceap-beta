'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import {
  employerMessagingSurface,
  partnerMessagingSurface,
} from '@/lib/portal/messagingSurfaces';
import { scrollBehavior } from '@/lib/a11y/scrollBehavior';

type MessageDto = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

type ThreadDto = {
  id: string;
  portalUserLastReadAt: string | null;
};

type InitialPayload = {
  thread: ThreadDto;
  messages: MessageDto[];
  portalUserId: string;
};

function dispatchBadgeRefresh() {
  try {
    window.dispatchEvent(new CustomEvent('wa-nav-badges-refresh'));
  } catch {
    /* ignore */
  }
}

type PortalTeamChatClientProps = {
  apiPath: string;
  initial: InitialPayload;
  subtitle: string;
  emptyHint: string;
  /** Matches voice-agent surfaces — partner vs employer gradient. */
  surfaceVariant: 'partner' | 'employer';
  /** Render without the outer voice-agent shell when embedded in another inbox shell. */
  decorated?: boolean;
  /** Server-validated subject for a shared team conversation. */
  contextLabel?: string;
  /** Optional contextual text placed in the composer, still requiring send. */
  initialDraft?: string;
};

export default function PortalTeamChatClient({
  apiPath,
  initial,
  subtitle,
  emptyHint,
  surfaceVariant,
  decorated = true,
  contextLabel,
  initialDraft = '',
}: PortalTeamChatClientProps) {
  const { portalUserId } = initial;
  const [thread, setThread] = useState(initial.thread);
  const [messages, setMessages] = useState(initial.messages);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: scrollBehavior() });
  }, []);

  const markRead = useCallback(async () => {
    try {
      const r = await fetch(apiPath, { method: 'PATCH', credentials: 'include' });
      if (r.ok) {
        const d = (await r.json()) as { portalUserLastReadAt?: string };
        if (d.portalUserLastReadAt) {
          setThread((t) => ({ ...t, portalUserLastReadAt: d.portalUserLastReadAt! }));
        }
        dispatchBadgeRefresh();
      }
    } catch {
      /* ignore */
    }
  }, [apiPath]);

  useEffect(() => {
    scrollToBottom();
    void markRead();
  }, [messages.length, scrollToBottom, markRead]);

  useEffect(() => {
    const onFocus = () => void markRead();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [markRead]);

  const threadId = thread.id;

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`portal-thread:${threadId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as Record<string, unknown>;
            const id = String(row.id ?? '');
            const authorId = String(row.author_id ?? '');
            const body = String(row.body ?? '');
            const createdAt = row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString();
            if (!id) return;
            setMessages((prev) => {
              if (prev.some((m) => m.id === id)) return prev;
              return [...prev, { id, threadId, authorId, body, createdAt }];
            });
            if (authorId !== portalUserId) void markRead();
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[PortalTeamChat] Realtime unavailable', e);
      return undefined;
    }
  }, [threadId, portalUserId, markRead]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || text === initialDraft.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(apiPath, {
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
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      }
      setDraft('');
      dispatchBadgeRefresh();
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  };

  const hint = useMemo(() => subtitle, [subtitle]);
  const surface =
    surfaceVariant === 'employer' ? employerMessagingSurface : partnerMessagingSurface;

  const inner = (
    <div className="member-counselor-chat">
      {contextLabel ? (
        <div
          role="status"
          style={{
            marginBottom: '0.75rem',
            padding: '0.7rem 0.85rem',
            borderRadius: '0.65rem',
            border: '1px solid var(--outline-variant)',
            background: 'var(--surface-container-low)',
            color: 'var(--color-on-surface-variant)',
            fontSize: '0.85rem',
          }}
        >
          Message context: <strong style={{ color: 'var(--color-on-surface)' }}>{contextLabel}</strong>
        </div>
      ) : null}
      {error ? (
        <p className="member-counselor-chat__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="member-counselor-chat__scroll" role="log" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? (
          <p style={{ color: 'var(--color-on-surface-variant)' }}>{emptyHint}</p>
        ) : (
          messages.map((m) => {
            const mine = m.authorId === portalUserId;
            return (
              <div
                key={m.id}
                className={`member-counselor-chat__bubble${mine ? ' member-counselor-chat__bubble--mine' : ''}`}
              >
                <div className="member-counselor-chat__bubble-body">{m.body}</div>
                <time className="member-counselor-chat__bubble-time" dateTime={m.createdAt}>
                  {new Date(m.createdAt).toLocaleString()}
                </time>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form className="member-counselor-chat__form" onSubmit={send}>
        <label htmlFor="portal-team-chat-input" className="sr-only">
          Message
        </label>
        <textarea
          id="portal-team-chat-input"
          className="member-counselor-chat__input"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          maxLength={8000}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={sending || !draft.trim() || draft.trim() === initialDraft.trim()}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );

  if (!decorated) return inner;

  return (
    <VoiceAgentSurface {...surface} subtext={hint}>
      {inner}
    </VoiceAgentSurface>
  );
}
