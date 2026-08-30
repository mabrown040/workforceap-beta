'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import AdminMemberCounselorChatClient from '@/components/admin/AdminMemberCounselorChatClient';
import type { CounselorInboxRow } from '@/lib/messages/counselorInbox';
import { counselorStaffMessagingSurface } from '@/lib/portal/messagingSurfaces';
import {
  InboxEmpty,
  InboxHeader,
  InboxList,
  InboxPane,
  InboxRowButton,
  InboxRowLayout,
  InboxSearch,
  InboxShell,
  InboxUnreadBadge,
} from '@/components/portal/ui/inbox/InboxPrimitives';

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
  /** Server-authorized member selected from a contextual deep link. */
  initialMemberId?: string | null;
};

type InboxFilter = 'all' | 'needs_reply' | 'unread';

function pickInitialSelection(rs: CounselorInboxRow[], initialMemberId?: string | null): string | null {
  if (rs.length === 0) return null;
  if (initialMemberId && rs.some((row) => row.memberId === initialMemberId)) return initialMemberId;
  const needs = rs.find((r) => r.needsReply);
  if (needs) return needs.memberId;
  const unread = rs.find((r) => r.unreadCount > 0);
  if (unread) return unread.memberId;
  return rs[0].memberId;
}

function InboxFilterTabs({
  filter,
  onFilter,
  allCount,
  needsCount,
  unreadCount,
}: {
  filter: InboxFilter;
  onFilter: (f: InboxFilter) => void;
  allCount: number;
  needsCount: number;
  unreadCount: number;
}) {
  const tab = (id: InboxFilter, label: string, count: number) => (
    <button
      key={id}
      type="button"
      onClick={() => onFilter(id)}
      style={{
        flex: 1,
        padding: '0.35rem 0.5rem',
        borderRadius: '0.5rem',
        border: 'none',
        fontSize: '0.72rem',
        fontWeight: filter === id ? 700 : 600,
        cursor: 'pointer',
        background:
          filter === id
            ? 'color-mix(in srgb, var(--color-accent) 18%, var(--surface-container-high))'
            : 'transparent',
        color: filter === id ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {count > 0 ? (
        <span style={{ marginLeft: '0.35rem', opacity: 0.85 }}>({count})</span>
      ) : null}
    </button>
  );

  return (
    <div
      role="tablist"
      aria-label="Filter conversations"
      style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.35rem',
        margin: '0 1rem 0.75rem',
        borderRadius: '0.625rem',
        background: 'color-mix(in srgb, var(--surface-container) 70%, transparent)',
        border: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
      }}
    >
      {tab('all', 'All', allCount)}
      {tab('needs_reply', 'Needs reply', needsCount)}
      {tab('unread', 'Unread', unreadCount)}
    </div>
  );
}

function MemberContextAside({ row }: { row: CounselorInboxRow }) {
  return (
    <aside
      className="portal-inbox__context"
      style={{
        width: 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        borderLeft: '1px solid color-mix(in srgb, var(--outline-variant) 70%, transparent)',
        background: 'var(--surface-container-lowest)',
      }}
    >
      <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 55%, transparent)' }}>
        <h3 className="portal-inbox__title" style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Context
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0.35rem 0 0', lineHeight: 1.45 }}>
          {row.programSubtitle}
          <br />
          <span style={{ fontWeight: 600, color: 'var(--color-on-surface)' }}>
            {row.enrollmentStatus === 'enrolled' ? 'Enrolled' : 'Not enrolled'}
          </span>
          {row.lastActivityLabel ? (
            <>
              <br />
              <span style={{ fontSize: '0.75rem' }}>{row.lastActivityLabel}</span>
            </>
          ) : null}
        </p>
        {row.needsReply ? (
          <p
            style={{
              margin: '0.75rem 0 0',
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-accent)',
            }}
          >
            Awaiting your reply
          </p>
        ) : null}
      </div>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        <Link href={`/counselor/students/${row.memberId}`} className="btn btn-primary btn-sm" style={{ justifyContent: 'center' }}>
          Open full profile
        </Link>
        <Link
          href={`/counselor/sessions/${row.memberId}/run`}
          className="btn btn-outline btn-sm"
          style={{ justifyContent: 'center' }}
        >
          Run in-office session
        </Link>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0.5rem 0 0', lineHeight: 1.4 }}>
          Notes, training, and placements live on the profile. Keep this tab for quick messaging.
        </p>
      </div>
    </aside>
  );
}

export default function CounselorMessagesInboxClient({ staffUserId, rows, initialMemberId }: Props) {
  const hasInitialSelection = Boolean(
    initialMemberId && rows.some((row) => row.memberId === initialMemberId),
  );
  const [search, setSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(() => pickInitialSelection(rows, initialMemberId));
  const [mobileList, setMobileList] = useState(() => !hasInitialSelection);
  const [chat, setChat] = useState<ChatPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedId((prev) => {
      if (rows.length === 0) return null;
      if (initialMemberId && rows.some((r) => r.memberId === initialMemberId)) return initialMemberId;
      if (prev && rows.some((r) => r.memberId === prev)) return prev;
      return pickInitialSelection(rows, initialMemberId);
    });
  }, [rows, initialMemberId]);

  useEffect(() => {
    if (initialMemberId && rows.some((row) => row.memberId === initialMemberId)) {
      setMobileList(false);
    }
  }, [rows, initialMemberId]);

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

  const needsReplyCount = useMemo(() => rows.filter((r) => r.needsReply).length, [rows]);
  const unreadThreadCount = useMemo(() => rows.filter((r) => r.unreadCount > 0).length, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.trim().toLowerCase();
        if (q && !r.memberName.toLowerCase().includes(q) && !r.preview.toLowerCase().includes(q)) {
          return false;
        }
        if (inboxFilter === 'needs_reply' && !r.needsReply) return false;
        if (inboxFilter === 'unread' && r.unreadCount <= 0) return false;
        return true;
      }),
    [rows, search, inboxFilter],
  );

  useEffect(() => {
    if (filtered.length === 0) return;
    if (!selectedId || !filtered.some((r) => r.memberId === selectedId)) {
      setSelectedId(filtered[0].memberId);
    }
  }, [filtered, selectedId]);

  const selectedRow = selectedId ? rows.find((x) => x.memberId === selectedId) : undefined;

  const selectMember = (memberId: string, isMobile: boolean) => {
    setSelectedId(memberId);
    if (isMobile) setMobileList(false);
  };

  const listPane = (opts: { mobile: boolean }) => (
    <InboxPane variant="list" style={opts.mobile ? { flex: 1 } : { width: 300, flexShrink: 0 }}>
      <InboxHeader
        title="Inbox"
        subtitle={rows.length > 0 ? 'Needs reply and unread sort to the top.' : undefined}
      />
      <InboxSearch value={search} onChange={setSearch} placeholder="Search by name or message…" />
      {rows.length > 0 ? (
        <InboxFilterTabs
          filter={inboxFilter}
          onFilter={setInboxFilter}
          allCount={rows.length}
          needsCount={needsReplyCount}
          unreadCount={unreadThreadCount}
        />
      ) : null}
      <InboxList>
        {filtered.length === 0 ? (
          search.trim() || inboxFilter !== 'all' ? (
            <InboxEmpty title="No conversations match" description="Try another filter or search term." />
          ) : (
            <InboxEmpty title="No members assigned yet" description="Members will appear here once an admin assigns them to you." />
          )
        ) : (
          filtered.map((r) => (
            <InboxRowButton
              key={r.memberId}
              active={selectedId === r.memberId}
              unread={r.unreadCount > 0}
              needsReply={r.needsReply}
              onClick={() => selectMember(r.memberId, opts.mobile)}
            >
              <InboxRowLayout
                title={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {r.memberName}
                    {r.needsReply ? (
                      <span className="portal-inbox-row__reply-pill">Reply</span>
                    ) : null}
                  </span>
                }
                subtitle={
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-on-surface-variant)' }}>
                    {r.programSubtitle}
                    {r.enrollmentStatus === 'enrolled' ? ' · Enrolled' : ' · Not enrolled'}
                    {r.lastActivityLabel ? ` · ${r.lastActivityLabel}` : ''}
                  </span>
                }
                meta={r.timeLabel}
                preview={r.preview}
                badge={<InboxUnreadBadge count={r.unreadCount} />}
              />
            </InboxRowButton>
          ))
        )}
      </InboxList>
    </InboxPane>
  );

  const chatHeader = chat ? (
    <div
      style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--outline-variant)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexShrink: 0,
        background: 'color-mix(in srgb, var(--surface-container-lowest) 92%, transparent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
        <div
          style={{
            width: 38,
            height: 38,
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
          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{chat.member.fullName}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: 0 }} className="wa-truncate">
            {(() => {
              const row = rows.find((x) => x.memberId === chat.member.id);
              const enrollment = row?.enrollmentStatus === 'enrolled' ? 'Enrolled' : 'Not enrolled';
              const activity = row?.lastActivityLabel ?? 'No recent activity';
              return `${row?.programSubtitle ?? '—'} · ${enrollment} · ${activity}`;
            })()}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <Link href={`/counselor/sessions/${chat.member.id}/run`} className="btn btn-outline btn-sm">
          Session
        </Link>
        <Link href={`/counselor/students/${chat.member.id}`} className="btn btn-primary btn-sm">
          Profile
        </Link>
      </div>
    </div>
  ) : null;

  const chatBody =
    rows.length === 0 ? (
      <div style={{ padding: '2rem', color: 'var(--color-on-surface-variant)' }}>No assigned members yet.</div>
    ) : loading || !chat ? (
      <div style={{ padding: '2rem', color: 'var(--color-on-surface-variant)' }}>Loading thread…</div>
    ) : (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 1rem 1rem',
        }}
      >
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
    <VoiceAgentSurface {...counselorStaffMessagingSurface} headline="Member messages" subtext="Work the queue: needs-reply first, everything syncs in real time.">
      <>
        <div className="md:wa-hidden wa-flex wa-flex-col" style={{ flex: 1, minHeight: 0 }}>
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
                  <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }} aria-hidden="true">
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

        <div className="wa-hidden md:wa-block">
          <InboxShell style={{ maxWidth: '1320px', height: 'min(88vh, 940px)' }}>
            {listPane({ mobile: false })}
            <InboxPane variant="thread" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              {chatHeader}
              {chatBody}
            </InboxPane>
            {selectedRow ? <MemberContextAside row={selectedRow} /> : null}
          </InboxShell>
        </div>
      </>
    </VoiceAgentSurface>
  );
}
