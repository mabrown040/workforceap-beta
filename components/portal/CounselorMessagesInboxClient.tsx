'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import type { CounselorInboxRow } from '@/lib/messages/counselorInbox';

type ChatPayload = {
  member: { id: string; fullName: string };
  thread: {
    id: string;
    memberId: string | null;
    counselorUserId: string | null;
    memberLastReadAt: string | null;
    counselorLastReadAt: string | null;
  };
  messages: Array<{
    id: string;
    threadId: string;
    authorId: string;
    body: string;
    createdAt: string;
    authorName: string;
  }>;
};

type Props = {
  staffUserId: string;
  rows: CounselorInboxRow[];
};

export default function CounselorMessagesInboxClient({ staffUserId, rows }: Props) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(rows.length > 0 ? rows[0].memberId : null);
  const [mobileList, setMobileList] = useState(true);
  const [chat, setChat] = useState<ChatPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const loadChat = useCallback(async (memberId: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/counselor/members/${memberId}/messages`, { credentials: 'include' });
      const d = await r.json();
      if (!r.ok) {
        setChat(null);
        return;
      }
      setChat({
        member: d.member,
        thread: d.thread,
        messages: d.messages,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) void loadChat(selectedId);
    else setChat(null);
  }, [selectedId, loadChat]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.memberName.toLowerCase().includes(q) || r.preview.toLowerCase().includes(q);
  });

  const selectMember = (memberId: string, isMobile: boolean) => {
    setSelectedId(memberId);
    if (isMobile) setMobileList(false);
  };

  const rowStyle = (active: boolean, unread: boolean): CSSProperties => ({
    width: '100%',
    textAlign: 'left',
    padding: '1rem 1.25rem',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(222, 191, 194, 0.2)',
    background: active
      ? 'color-mix(in srgb, var(--color-accent) 12%, var(--surface-container-lowest))'
      : unread
        ? 'color-mix(in srgb, var(--color-accent) 6%, transparent)'
        : 'transparent',
    borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
  });

  const listPane = (opts: { mobile: boolean }) => (
    <div
      style={
        opts.mobile
          ? { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }
          : {
              borderRight: '1px solid var(--outline-variant)',
              overflowY: 'auto',
              width: 300,
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }
      }
    >
      <div style={{ padding: '1rem' }}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            border: '1px solid var(--outline-variant)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            background: 'var(--surface-container-lowest)',
            outline: 'none',
            fontFamily: 'inherit',
            color: 'var(--color-on-surface)',
          }}
        />
      </div>
      {filtered.map((r) => (
        <button
          key={r.memberId}
          type="button"
          onClick={() => selectMember(r.memberId, opts.mobile)}
          style={rowStyle(selectedId === r.memberId, r.unreadCount > 0)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{r.memberName}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)' }}>{r.timeLabel}</span>
          </div>
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--color-on-surface-variant)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {r.preview}
          </p>
          {r.unreadCount > 0 && (
            <span
              style={{
                marginTop: '0.375rem',
                display: 'inline-block',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              {r.unreadCount} new
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const chatHeader = chat ? (
    <div
      style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '9999px',
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            color: '#fff',
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          {chat.member.fullName
            ?.split(' ')
            .filter(Boolean)
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase() ?? '—'}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0 }}>{chat.member.fullName}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }} className="wa-truncate">
            {rows.find((x) => x.memberId === chat.member.id)?.programSubtitle ?? '—'}
          </p>
        </div>
      </div>
      <Link
        href={`/counselor/students/${chat.member.id}`}
        style={{
          padding: '0.5rem 0.875rem',
          background: 'var(--surface-container)',
          color: 'var(--color-on-surface)',
          borderRadius: '0.375rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          textDecoration: 'none',
          flexShrink: 0,
          border: '1px solid var(--outline-variant)',
        }}
      >
        View Profile
      </Link>
    </div>
  ) : null;

  const chatBody =
    rows.length === 0 ? (
      <div style={{ padding: '2rem', color: 'var(--color-on-surface-variant)' }}>No assigned members yet.</div>
    ) : loading || !chat ? (
      <div style={{ padding: '2rem', color: 'var(--color-on-surface-variant)' }}>Loading…</div>
    ) : (
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 1rem 1rem' }}>
        <AdminMemberCounselorChatClient
          compact
          messagesApiBase={`/api/counselor/members/${chat.member.id}/messages`}
          initial={{
            staffUserId,
            member: chat.member,
            thread: chat.thread,
            messages: chat.messages,
          }}
        />
      </div>
    );

  return (
    <>
      <div className="wa-md:wa-hidden wa-flex wa-flex-col" style={{ flex: 1, minHeight: 0 }}>
        {mobileList ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{listPane({ mobile: true })}</div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid color-mix(in srgb, var(--outline-variant, #e8e0dd) 70%, transparent)',
              }}
            >
              <button
                type="button"
                onClick={() => setMobileList(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>
                  arrow_back
                </span>
                All conversations
              </button>
            </div>
            {chatHeader}
            {chatBody}
          </div>
        )}
      </div>

      <div
        className="wa-hidden wa-md:wa-flex"
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          height: 'min(85vh, 900px)',
          border: '1px solid color-mix(in srgb, var(--outline-variant, #e8e0dd) 70%, transparent)',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          flexDirection: 'row',
        }}
      >
        {listPane({ mobile: false })}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            background: 'var(--surface-container-lowest)',
          }}
        >
          {chatHeader}
          {chatBody}
        </div>
      </div>
    </>
  );
}
