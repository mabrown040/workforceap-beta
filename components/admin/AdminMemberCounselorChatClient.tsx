'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

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
  authorName: string;
};

type InitialPayload = {
  member: { id: string; fullName: string };
  thread: ThreadDto;
  messages: MessageDto[];
  staffUserId: string;
};

/** Base path for GET/POST/PATCH (e.g. /api/admin/members/:id/messages or /api/counselor/members/:id/messages) */
export default function AdminMemberCounselorChatClient({
  initial,
  messagesApiBase,
}: {
  initial: InitialPayload;
  messagesApiBase?: string;
}) {
  const { staffUserId, member } = initial;
  const apiBase = messagesApiBase ?? `/api/admin/members/${member.id}/messages`;
  const [thread, setThread] = useState(initial.thread);
  const [messages, setMessages] = useState<MessageDto[]>(initial.messages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const markRead = useCallback(async () => {
    try {
      await fetch(apiBase, { method: 'PATCH', credentials: 'include' });
    } catch {
      /* ignore */
    }
  }, [apiBase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    void markRead();
  }, [messages.length, markRead]);

  const threadId = thread.id;

  useEffect(() => {
    let cancelled = false;
    try {
      const supabase = createSupabaseBrowserClient();
      const channel = supabase
        .channel(`staff-thread:${threadId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${threadId}` },
          async (payload) => {
            if (cancelled) return;
            const row = payload.new as Record<string, unknown>;
            const id = String(row.id ?? '');
            const authorId = String(row.author_id ?? '');
            const body = String(row.body ?? '');
            const createdAt = row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString();
            if (!id) return;
            const authorName =
              authorId === member.id
                ? member.fullName
                : authorId === staffUserId
                  ? 'You'
                  : 'Counselor';
            setMessages((prev) => {
              if (prev.some((m) => m.id === id)) return prev;
              return [...prev, { id, threadId, authorId, body, createdAt, authorName }];
            });
            if (authorId === member.id) void markRead();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'message_threads', filter: `id=eq.${threadId}` },
          (payload) => {
            if (cancelled) return;
            const row = payload.new as Record<string, unknown>;
            setThread((t) => ({
              ...t,
              counselorUserId: row.counselor_user_id != null ? String(row.counselor_user_id) : t.counselorUserId,
              memberLastReadAt:
                row.member_last_read_at != null
                  ? new Date(String(row.member_last_read_at)).toISOString()
                  : t.memberLastReadAt,
              counselorLastReadAt:
                row.counselor_last_read_at != null
                  ? new Date(String(row.counselor_last_read_at)).toISOString()
                  : t.counselorLastReadAt,
            }));
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    } catch (e) {
      console.warn('[AdminMemberCounselorChat] Realtime unavailable', e);
      return undefined;
    }
  }, [threadId, member.id, member.fullName, staffUserId, markRead, apiBase]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(apiBase, {
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
      const msg = data.message as Omit<MessageDto, 'authorName'> | undefined;
      if (msg) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, { ...msg, authorName: 'You' }]
        );
      }
      setDraft('');
    } catch {
      setError('Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-member-counselor-chat">
      <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
        Messages sync in real time. Member last read:{' '}
        {thread.memberLastReadAt ? new Date(thread.memberLastReadAt).toLocaleString() : '—'}
      </p>
      {error ? (
        <p className="member-counselor-chat__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="member-counselor-chat__scroll admin-member-counselor-chat__scroll" role="log" aria-live="polite">
        {messages.map((m) => {
          const fromMember = m.authorId === member.id;
          return (
            <div
              key={m.id}
              className={`member-counselor-chat__bubble${fromMember ? '' : ' member-counselor-chat__bubble--mine'}`}
            >
              <div className="member-counselor-chat__bubble-meta">{m.authorName}</div>
              <div className="member-counselor-chat__bubble-body">{m.body}</div>
              <time className="member-counselor-chat__bubble-time" dateTime={m.createdAt}>
                {new Date(m.createdAt).toLocaleString()}
              </time>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="member-counselor-chat__form" onSubmit={send}>
        <label htmlFor="admin-chat-input" className="sr-only">
          Reply
        </label>
        <textarea
          id="admin-chat-input"
          className="member-counselor-chat__input"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Reply to ${member.fullName}…`}
          maxLength={8000}
        />
        <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
          {sending ? 'Sending…' : 'Send reply'}
        </button>
      </form>
    </div>
  );
}
