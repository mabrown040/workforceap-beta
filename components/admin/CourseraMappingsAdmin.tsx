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

function formatMemberOptionLabel(member: MemberOption) {
  return `${member.fullName} · ${member.email}`;
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
      <section style={{ ...cardStyle, minWidth: 0, overflow: 'hidden' }}>
        <div className="coursera-header-row" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Manual identity mapping</h2>
            <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)', maxWidth: '48rem' }}>
              Bind a Coursera learner email or actor ID to a WAP member when direct email matching is not enough.
            </p>
          </div>
          <div className="coursera-chip-row" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="content-chip">{mappings.length} mapping{mappings.length === 1 ? '' : 's'}</div>
            <div className="content-chip">{unmatchedEvents.length} unmatched event{unmatchedEvents.length === 1 ? '' : 's'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <div className="coursera-form-grid" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Member</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inputStyle} className="coursera-input" required>
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {formatMemberOptionLabel(member)}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Coursera email</label>
              <input value={courseraEmail} onChange={(e) => setCourseraEmail(e.target.value)} style={inputStyle} className="coursera-input" placeholder="learner@example.com" />
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Actor identifier</label>
              <input value={actorIdentifier} onChange={(e) => setActorIdentifier(e.target.value)} style={inputStyle} className="coursera-input" placeholder="optional stable Coursera actor id" />
            </div>

            <div style={{ minWidth: 0 }}>
              <label style={labelStyle}>Actor home page</label>
              <input value={actorHomePage} onChange={(e) => setActorHomePage(e.target.value)} style={inputStyle} className="coursera-input" placeholder="optional actor home page" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...inputStyle, minHeight: '5rem', resize: 'vertical' }} className="coursera-input" placeholder="Why this mapping exists, test notes, etc." />
          </div>

          {selectedMember && (
            <div className="coursera-selected-member" style={{ padding: '0.85rem 1rem', borderRadius: '0.75rem', background: 'var(--surface-container)', color: 'var(--color-on-surface-variant)' }}>
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

          <div className="coursera-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary coursera-action-button" disabled={isPending || !userId || (!courseraEmail && !actorIdentifier)}>
              {isPending ? 'Saving…' : 'Save mapping'}
            </button>
            <button
              type="button"
              className="btn btn-outline coursera-action-button"
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

        <style jsx>{`
          .coursera-form-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .coursera-input {
            box-sizing: border-box;
            min-width: 0;
          }

          .coursera-selected-member {
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          .coursera-actions {
            align-items: stretch;
          }

          .coursera-action-button {
            min-height: 44px;
          }

          @media (max-width: 640px) {
            .coursera-header-row {
              gap: 0.75rem;
            }

            .coursera-chip-row {
              width: 100%;
              gap: 0.5rem;
            }

            .coursera-actions {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
            }

            .coursera-action-button {
              width: 100%;
              justify-content: center;
            }
          }

          @media (min-width: 860px) {
            .coursera-form-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
        `}</style>
      </section>

      <section style={{ ...cardStyle, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Saved mappings</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
            These mappings are checked before direct email match during xAPI completion processing.
          </p>
        </div>

        <div className="coursera-table-wrap" style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <table className="coursera-desktop-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
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

        <div className="coursera-mobile-list" aria-label="Saved mappings mobile view">
          {mappings.length === 0 ? (
            <div className="coursera-mobile-card" style={{ color: 'var(--color-on-surface-variant)' }}>
              No manual mappings yet.
            </div>
          ) : mappings.map((mapping) => (
            <article key={mapping.id} className="coursera-mobile-card">
              <div className="coursera-mobile-row">
                <strong>{mapping.userFullName}</strong>
                <span style={{ color: 'var(--color-on-surface-variant)' }}>{mapping.userEmail}</span>
              </div>
              <div className="coursera-mobile-field"><strong>Coursera email:</strong> {mapping.courseraEmail || '—'}</div>
              <div className="coursera-mobile-field"><strong>Actor ID:</strong> {mapping.actorIdentifier || '—'}</div>
              {mapping.actorHomePage ? <div className="coursera-mobile-field"><strong>Actor home page:</strong> {mapping.actorHomePage}</div> : null}
              <div className="coursera-mobile-field"><strong>Source:</strong> {mapping.source}</div>
              <div className="coursera-mobile-field"><strong>Last seen:</strong> {fmtDate(mapping.lastSeenAt)}</div>
              <div className="coursera-mobile-field"><strong>Notes:</strong> {mapping.notes || '—'}</div>
            </article>
          ))}
        </div>
      </section>

      <section style={{ ...cardStyle, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Unmatched xAPI events</h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--color-on-surface-variant)' }}>
            Use these to seed a manual mapping when Coursera sends a learner identity that WAP does not recognize yet.
          </p>
        </div>

        <div className="coursera-table-wrap" style={{ overflowX: 'auto', maxWidth: '100%' }}>
          <table className="coursera-desktop-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
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

        <div className="coursera-mobile-list" aria-label="Unmatched xAPI events mobile view">
          {unmatchedEvents.length === 0 ? (
            <div className="coursera-mobile-card" style={{ color: 'var(--color-on-surface-variant)' }}>
              No unmatched events yet.
            </div>
          ) : unmatchedEvents.map((event) => (
            <article key={event.id} className="coursera-mobile-card">
              <div className="coursera-mobile-field"><strong>Learner:</strong> {event.actorEmail || '—'}</div>
              {event.actorIdentifier ? <div className="coursera-mobile-field"><strong>Actor ID:</strong> {event.actorIdentifier}</div> : null}
              {event.actorHomePage ? <div className="coursera-mobile-field"><strong>Actor home page:</strong> {event.actorHomePage}</div> : null}
              {event.statementId ? <div className="coursera-mobile-field"><strong>Statement:</strong> {event.statementId}</div> : null}
              <div className="coursera-mobile-field"><strong>Course:</strong> {event.courseName || event.courseSlug || '—'}</div>
              {event.verbId ? <div className="coursera-mobile-field"><strong>Verb:</strong> {event.verbId}</div> : null}
              <div className="coursera-mobile-field"><strong>Status:</strong> {event.completionStatus}</div>
              <div className="coursera-mobile-field"><strong>Received:</strong> {fmtDate(event.receivedAt)}</div>
              {event.error ? <div className="coursera-mobile-field" style={{ color: '#fca5a5' }}><strong>Error:</strong> {event.error}</div> : null}
              <button type="button" className="btn btn-outline" onClick={() => applyUnmatchedEvent(event)}>
                Use in form
              </button>
            </article>
          ))}
        </div>

        <style jsx>{`
          .coursera-mobile-list {
            display: none;
            gap: 0.75rem;
          }

          .coursera-mobile-card {
            display: grid;
            gap: 0.5rem;
            padding: 0.9rem;
            border: 1px solid var(--outline-variant);
            border-radius: 0.85rem;
            background: var(--surface-container);
          }

          .coursera-mobile-row,
          .coursera-mobile-field {
            display: grid;
            gap: 0.2rem;
            word-break: break-word;
            overflow-wrap: anywhere;
          }

          @media (max-width: 640px) {
            .coursera-desktop-table,
            .coursera-table-wrap {
              display: none;
            }

            .coursera-mobile-list {
              display: grid;
            }
          }
        `}</style>
      </section>
    </div>
  );
}
