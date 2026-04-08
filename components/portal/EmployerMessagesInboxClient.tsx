'use client';

import type { CSSProperties } from 'react';
import { useCallback, useMemo, useState } from 'react';
import PortalTeamChatClient from '@/components/portal/PortalTeamChatClient';
import EmployerApplicationChatClient from '@/components/portal/EmployerApplicationChatClient';
import type { EmployerInboxCandidateRow, EmployerInboxTeamRow } from '@/lib/messages/employerInbox';

type TeamMsg = {
  id: string;
  threadId: string;
  authorId: string;
  body: string;
  createdAt: string;
};

type Props = {
  portalUserId: string;
  teamRow: EmployerInboxTeamRow;
  candidateRows: EmployerInboxCandidateRow[];
  teamInitial: {
    thread: { id: string; portalUserLastReadAt: string | null };
    messages: TeamMsg[];
  };
};

type Selection = { kind: 'team' } | { kind: 'candidate'; applicationId: string };

export default function EmployerMessagesInboxClient({
  portalUserId,
  teamRow,
  candidateRows,
  teamInitial,
}: Props) {
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<Selection>({ kind: 'team' });
  const [mobileList, setMobileList] = useState(true);
  const [appPayload, setAppPayload] = useState<{
    applicationId: string;
    studentName: string;
    jobTitle: string;
    messages: Array<{
      id: string;
      body: string;
      createdAt: string;
      authorName: string;
      isFromEmployer: boolean;
    }>;
  } | null>(null);
  const [appLoading, setAppLoading] = useState(false);

  const loadApplication = useCallback(async (applicationId: string) => {
    setAppLoading(true);
    try {
      const r = await fetch(`/api/employer/applications/${applicationId}/messages`, { credentials: 'include' });
      const d = await r.json();
      if (!r.ok) {
        setAppPayload(null);
        return;
      }
      setAppPayload({
        applicationId,
        studentName: d.application.studentName,
        jobTitle: d.application.jobTitle,
        messages: d.messages,
      });
    } finally {
      setAppLoading(false);
    }
  }, []);

  const onSelect = useCallback(
    async (next: Selection, fromMobile: boolean) => {
      setSel(next);
      if (fromMobile) setMobileList(false);
      if (next.kind === 'candidate') {
        await loadApplication(next.applicationId);
      } else {
        setAppPayload(null);
      }
    },
    [loadApplication]
  );

  const filteredCandidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidateRows;
    return candidateRows.filter(
      (c) =>
        c.studentName.toLowerCase().includes(q) ||
        c.jobTitle.toLowerCase().includes(q) ||
        c.preview.toLowerCase().includes(q)
    );
  }, [candidateRows, search]);

  const showTeam = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      'workforceap'.includes(q) ||
      teamRow.title.toLowerCase().includes(q) ||
      teamRow.preview.toLowerCase().includes(q)
    );
  }, [search, teamRow]);

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
          ? { overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }
          : {
              borderRight: '1px solid color-mix(in srgb, var(--outline-variant, #e8e0dd) 70%, transparent)',
              overflowY: 'auto',
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
          placeholder="Search conversations…"
          style={{
            width: '100%',
            padding: '0.625rem 0.875rem',
            border: '1px solid color-mix(in srgb, var(--color-accent) 22%, var(--outline-variant, #e8e0dd))',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            background: 'var(--surface-container-lowest)',
            outline: 'none',
            fontFamily: 'inherit',
            color: 'var(--color-on-surface)',
          }}
        />
      </div>
      {showTeam && (
        <button
          type="button"
          onClick={() => void onSelect({ kind: 'team' }, opts.mobile)}
          style={rowStyle(sel.kind === 'team', teamRow.unreadCount > 0)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{teamRow.title}</span>
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
            {teamRow.preview}
          </p>
          {teamRow.unreadCount > 0 && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.375rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              {teamRow.unreadCount} new
            </span>
          )}
        </button>
      )}
      {filteredCandidates.map((c) => (
        <button
          key={c.applicationId}
          type="button"
          onClick={() => void onSelect({ kind: 'candidate', applicationId: c.applicationId }, opts.mobile)}
          style={rowStyle(
            sel.kind === 'candidate' && sel.applicationId === c.applicationId,
            c.unreadCount > 0
          )}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{c.studentName}</span>
          </div>
          <p
            style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.25rem' }}
            className="wa-truncate"
          >
            {c.jobTitle}
          </p>
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
            {c.preview}
          </p>
          {c.unreadCount > 0 && (
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.375rem',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                background: 'var(--color-accent)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
              }}
            >
              {c.unreadCount} new
            </span>
          )}
        </button>
      ))}
    </div>
  );

  const teamChat = (
    <PortalTeamChatClient
      surfaceVariant="employer"
      apiPath="/api/employer/messages"
      initial={{
        thread: teamInitial.thread,
        messages: teamInitial.messages,
        portalUserId,
      }}
      subtitle="We typically reply within one business day."
      emptyHint="No messages yet. Ask a question about job postings, applications, or candidate matches."
    />
  );

  const threadPane = (
    <>
      {sel.kind === 'team' ? (
        <div style={{ padding: '0 1rem 1rem', overflow: 'auto', flex: 1, minHeight: 0 }}>{teamChat}</div>
      ) : appLoading || !appPayload ? (
        <div style={{ padding: '2rem', color: 'var(--color-on-surface-variant)' }}>Loading…</div>
      ) : (
        <EmployerApplicationChatClient
          applicationId={appPayload.applicationId}
          studentName={appPayload.studentName}
          jobTitle={appPayload.jobTitle}
          initialMessages={appPayload.messages}
        />
      )}
    </>
  );

  return (
    <>
      {/* Mobile master–detail */}
      <div className="wa-md:wa-hidden wa-flex wa-flex-col" style={{ flex: 1, minHeight: 0 }}>
        {mobileList ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{listPane({ mobile: true })}</div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{threadPane}</div>
          </div>
        )}
      </div>

      {/* Desktop split */}
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
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {listPane({ mobile: false })}
        </div>
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
          {threadPane}
        </div>
      </div>
    </>
  );
}
