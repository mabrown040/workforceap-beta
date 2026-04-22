'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type MemberOption = {
  id: string;
  fullName: string;
  email: string;
  programTitle: string | null;
};

type MappingRow = {
  id: string;
  userId: string;
  courseraEmail: string | null;
  actorIdentifier: string | null;
  actorHomePage: string | null;
  source: string;
  notes: string | null;
  lastSeenAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userEmail: string;
  userFullName: string;
};

type UnmatchedEvent = {
  id: string;
  statementId: string | null;
  actorEmail: string | null;
  actorIdentifier: string | null;
  actorHomePage: string | null;
  courseSlug: string | null;
  courseName: string | null;
  verbId: string | null;
  completionStatus: string;
  error: string | null;
  receivedAt: Date | string;
  updatedAt: Date | string;
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest)',
  border: '1px solid var(--outline-variant)',
  borderRadius: '1rem',
  padding: '1rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 700,
  color: 'var(--color-on-surface-variant)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.375rem',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.7rem 0.8rem',
  borderRadius: '0.65rem',
  border: '1px solid var(--outline-variant)',
  background: 'var(--surface-container)',
  color: 'var(--color-on-surface)',
  fontSize: '0.95rem',
  fontFamily: 'inherit',
};

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function CourseraMappingsAdmin({
  members,
  mappings,
  unmatchedEvents,
}: {
  members: MemberOption[];
  mappings: MappingRow[];
  unmatchedEvents: UnmatchedEvent[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState('');
  const [courseraEmail, setCourseraEmail] = useState('');
  const [actorIdentifier, setActorIdentifier] = useState('');
  const [actorHomePage, setActorHomePage] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const selectedMember = useMemo(
    () => members.find((member) => member.id === userId) ?? null,
    [members, userId]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/coursera/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            courseraEmail: courseraEmail || undefined,
            actorIdentifier: actorIdentifier || undefined,
            actorHomePage: actorHomePage || undefined,
            notes: notes || undefined,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setMessage({ kind: 'error', text: payload.error || 'Unable to save mapping.' });
          return;
        }

        setMessage({ kind: 'success', text: 'Coursera mapping saved.' });
        router.refresh();
      } catch {
        setMessage({ kind: 'error', text: 'Network error while saving mapping.' });
      }
    });
  }

  function applyUnmatchedEvent(event: UnmatchedEvent) {
    setCourseraEmail(event.actorEmail || '');
    setActorIdentifier(event.actorIdentifier || '');
    setActorHomePage(event.actorHomePage || '');
    setNotes((current) => current || `Seeded from unmatched xAPI event ${event.statementId || event.id}`);
    setMessage(null);
  }

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <section style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Manual identity mapping</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)', maxWidth: '48rem' }}>
              Bind a Coursera learner email or actor ID to a WAP member when direct email matching is not enough.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="content-chip">{mappings.length} mapping{mappings.length === 1 ? '' : 's'}</div>
            <div className="content-chip">{unmatchedEvents.length} unmatched event{unmatchedEvents.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Member</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle} required>
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName} · {member.email}{member.programTitle ? ` · ${member.programTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Coursera email</label>
              <input value={courseraEmail} onChange={(e) => setCourseraEmail(e.target.value)} style={inputStyle} placeholder="learner@example.com" />
            </div>

            <div>
              <label style={labelStyle}>Actor identifier</label>
              <input value={actorIdentifier} onChange={(e) => setActorIdentifier(e.target.value)} style={inputStyle} placeholder="optional stable Coursera actor id" />
            </div>

            <div>
              <label style={labelStyle}>Actor home page</label>
              <input value={actorHomePage} onChange={(e) => setActorHomePage(e.target.value)} style={inputStyle} placeholder="optional actor home page" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: '5rem', resize: 'vertical' }} placeholder="Why this mapping exists, test notes, etc." />
          </div>

          {selectedMember && (
            <div style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' }}>
              Mapping to <strong style={{ color: 'var(--color-on-surface)' }}>{selectedMember.fullName}</strong> ({selectedMember.email})
              {selectedMember.programTitle ? ` in ${selectedMember.programTitle}` : ''}.
            </div>
          )}

          {message && (
            <div style={{
              padding: '0.8rem 1rem',
              borderRadius: '0.75rem',
              background: message.kind === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${message.kind === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: message.kind === 'success' ? '#86efac' : '#fca5a5',
            }}>
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" disabled={isPending || !userId || (!courseraEmail && !actorIdentifier)}>
              {isPending ? 'Saving…' : 'Save mapping'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setUserId('');
                setCourseraEmail('');
                setActorIdentifier('');
                setActorHomePage('');
                setNotes('');
                setMessage(null);
              }}
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Saved mappings</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
            These mappings are checked before direct email match during xAPI completion processing.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Member</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Coursera email</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Actor ID</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Source</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Last seen</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '1rem 0.5rem', color: 'var(--color-on-surface-variant)' }}>
                    No manual mappings yet.
                  </td>
                </tr>
              ) : mappings.map((mapping) => (
                <tr key={mapping.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 700 }}>{mapping.userFullName}</div>
                    <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.875rem' }}>{mapping.userEmail}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{mapping.courseraEmail || '—'}</td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                    <div>{mapping.actorIdentifier || '—'}</div>
                    {mapping.actorHomePage ? (
                      <div style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>{mapping.actorHomePage}</div>
                    ) : null}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{mapping.source}</td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{fmtDate(mapping.lastSeenAt)}</td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top', color: 'var(--color-on-surface-variant)' }}>{mapping.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Unmatched xAPI events</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
            Use these to seed a manual mapping when Coursera sends a learner identity that WAP does not recognize yet.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--outline-variant)' }}>
                <th style={{ padding: '0.75rem 0.5rem' }}>Learner identity</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Course</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Received</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem 0.5rem', color: 'var(--color-on-surface-variant)' }}>
                    No unmatched events yet.
                  </td>
                </tr>
              ) : unmatchedEvents.map((event) => (
                <tr key={event.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                    <div>{event.actorEmail || '—'}</div>
                    {event.actorIdentifier ? <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>Actor: {event.actorIdentifier}</div> : null}
                    {event.actorHomePage ? <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>{event.actorHomePage}</div> : null}
                    {event.statementId ? <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>Statement: {event.statementId}</div> : null}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                    <div>{event.courseName || event.courseSlug || '—'}</div>
                    {event.verbId ? <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>{event.verbId}</div> : null}
                    {event.error ? <div style={{ fontSize: '0.875rem', color: '#fca5a5' }}>{event.error}</div> : null}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{event.completionStatus}</td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>{fmtDate(event.receivedAt)}</td>
                  <td style={{ padding: '0.75rem 0.5rem', verticalAlign: 'top' }}>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => applyUnmatchedEvent(event)}>
                      Use in form
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
