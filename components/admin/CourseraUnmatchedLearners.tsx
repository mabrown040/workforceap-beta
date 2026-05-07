'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type MemberOption = {
  id: string;
  fullName: string;
  email: string;
  programTitle: string | null;
};

export type UnmatchedLearnerView = {
  externalEmail: string;
  externalName: string | null;
  badges: Array<{ badgeSlug: string; badgeTitle: string; progressPercent: number }>;
  courseCount: number;
  badgeCount: number;
  lastActivityTime: Date | string | null;
};

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest)',
  border: '1px solid var(--outline-variant)',
  borderRadius: '1rem',
  padding: '1rem',
};

function fmtDateTime(value: Date | string | null) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function CourseraUnmatchedLearners({
  learners,
  members,
}: {
  learners: UnmatchedLearnerView[];
  members: MemberOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openEmail, setOpenEmail] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<
    Record<string, { kind: 'success' | 'error'; text: string } | null>
  >({});

  function handleSubmit(externalEmail: string) {
    const userId = selectedUserId[externalEmail];
    if (!userId) {
      setFeedback((prev) => ({
        ...prev,
        [externalEmail]: { kind: 'error', text: 'Pick a WAP user first.' },
      }));
      return;
    }

    setFeedback((prev) => ({ ...prev, [externalEmail]: null }));

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/coursera/map-unmatched', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseraEmail: externalEmail, userId }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setFeedback((prev) => ({
            ...prev,
            [externalEmail]: { kind: 'error', text: payload?.error || 'Mapping failed.' },
          }));
          return;
        }
        const courses = payload?.backfill?.courseRowsUpdated ?? 0;
        const badges = payload?.backfill?.badgeRowsUpdated ?? 0;
        const xapi = payload?.xapiReplay as
          | {
              replayed?: number;
              breakdown?: { completedOk?: number; errored?: number; ignored?: number; unmatched?: number };
            }
          | undefined;
        const xapiSummary = (() => {
          if (!xapi || !xapi.replayed) return '';
          const b = xapi.breakdown;
          if (!b) return ` Replayed ${xapi.replayed} xAPI event(s).`;
          const parts: string[] = [];
          if ((b.completedOk ?? 0) > 0) parts.push(`${b.completedOk} completed`);
          if ((b.errored ?? 0) > 0) parts.push(`${b.errored} errored`);
          if ((b.ignored ?? 0) > 0) parts.push(`${b.ignored} progress`);
          if ((b.unmatched ?? 0) > 0) parts.push(`${b.unmatched} unmatched`);
          return parts.length
            ? ` Replayed ${xapi.replayed}: ${parts.join(', ')}.`
            : ` Replayed ${xapi.replayed} xAPI event(s).`;
        })();
        setFeedback((prev) => ({
          ...prev,
          [externalEmail]: {
            kind: 'success',
            text: `Mapped — backfilled ${courses} course row(s), ${badges} badge row(s).${xapiSummary}`,
          },
        }));
        router.refresh();
      } catch {
        setFeedback((prev) => ({
          ...prev,
          [externalEmail]: { kind: 'error', text: 'Network error while saving mapping.' },
        }));
      }
    });
  }

  if (learners.length === 0) {
    return (
      <section style={cardStyle}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera-only learners (unmatched)</h2>
        <p style={{ marginTop: '0.4rem', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
          No unmatched Coursera learners. Every email in <code>coursera_course_progress</code> and{' '}
          <code>coursera_badge_progress</code> resolves to a WAP user.
        </p>
      </section>
    );
  }

  return (
    <section style={cardStyle}>
      <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Coursera-only learners (unmatched)</h2>
      <p style={{ margin: '0.4rem 0 0', color: 'var(--color-on-surface-variant)', fontSize: '0.9rem' }}>
        These learners exist on Coursera but are not bound to a WAP user. Map each to a WAP member
        — the action creates a <code>coursera_identity_mappings</code> row and backfills{' '}
        <code>user_id</code> on existing course/badge progress rows for the same email.
      </p>

      <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Coursera learner</th>
              <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Badges</th>
              <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Activity</th>
              <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Last seen</th>
              <th style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {learners.map((learner) => {
              const isOpen = openEmail === learner.externalEmail;
              const hash = encodeURIComponent(learner.externalEmail);
              const fb = feedback[learner.externalEmail];
              return (
                <tr key={learner.externalEmail}>
                  <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    <strong>{learner.externalName || learner.externalEmail}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
                      {learner.externalEmail}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.2rem' }}>
                      <a href={`/admin/coursera/learners/unmatched/${hash}`}>view detail →</a>
                    </div>
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    {learner.badges.length === 0 ? (
                      <span style={{ color: 'var(--color-on-surface-variant)' }}>—</span>
                    ) : (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.2rem' }}>
                        {learner.badges.map((b) => (
                          <li key={b.badgeSlug} style={{ fontSize: '0.85rem' }}>
                            {b.badgeTitle}
                            <span style={{ color: 'var(--color-on-surface-variant)' }}>
                              {' '}({b.progressPercent.toFixed(2)}%)
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    <span style={{ color: 'var(--color-on-surface-variant)' }}>
                      {learner.courseCount} course{learner.courseCount === 1 ? '' : 's'} ·{' '}
                      {learner.badgeCount} badge{learner.badgeCount === 1 ? '' : 's'}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    {fmtDateTime(learner.lastActivityTime)}
                  </td>
                  <td style={{ padding: '0.5rem 0.6rem', borderBottom: '1px solid var(--outline-variant)' }}>
                    {isOpen ? (
                      <div style={{ display: 'grid', gap: '0.4rem', minWidth: '14rem' }}>
                        <select
                          value={selectedUserId[learner.externalEmail] ?? ''}
                          onChange={(e) =>
                            setSelectedUserId((prev) => ({
                              ...prev,
                              [learner.externalEmail]: e.target.value,
                            }))
                          }
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.6rem',
                            borderRadius: '0.5rem',
                            border: '1px solid var(--outline-variant)',
                            background: 'var(--surface-container)',
                            color: 'var(--color-on-surface)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <option value="">Select a WAP member…</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} · {m.email}
                              {m.programTitle ? ` · ${m.programTitle}` : ''}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSubmit(learner.externalEmail)}
                            style={{
                              padding: '0.4rem 0.7rem',
                              borderRadius: '0.5rem',
                              border: 'none',
                              background: 'var(--color-primary)',
                              color: 'var(--color-on-primary)',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            {isPending ? 'Saving…' : 'Save mapping'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenEmail(null);
                              setFeedback((prev) => ({ ...prev, [learner.externalEmail]: null }));
                            }}
                            style={{
                              padding: '0.4rem 0.7rem',
                              borderRadius: '0.5rem',
                              border: '1px solid var(--outline-variant)',
                              background: 'var(--surface-container)',
                              color: 'var(--color-on-surface)',
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        {fb ? (
                          <span
                            style={{
                              fontSize: '0.78rem',
                              color: fb.kind === 'success' ? 'rgb(22, 163, 74)' : 'rgb(239, 68, 68)',
                            }}
                          >
                            {fb.text}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setOpenEmail(learner.externalEmail)}
                        style={{
                          padding: '0.4rem 0.7rem',
                          borderRadius: '0.5rem',
                          border: '1px solid var(--outline-variant)',
                          background: 'var(--surface-container)',
                          color: 'var(--color-on-surface)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Map to WAP user…
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
