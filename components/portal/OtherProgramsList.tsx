'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "Other programs" card list rendered below the primary training block on
 * `/dashboard/training`. Surfaces each non-primary `CourseEnrollment` row so
 * a learner enrolled in 2+ programs can see — and promote — secondaries
 * without leaving the page.
 *
 * The page already renders `TrainingProgramTabs` at the top for switching
 * which program's full curriculum is displayed; this list is the read-only
 * "you're also enrolled in…" view at the bottom. The "Switch primary"
 * button POSTs to `/api/member/enrollments/{id}/set-primary` (same route
 * the tab strip uses).
 *
 * Hidden when the user has zero secondary enrollments — single-program
 * users see no UI change.
 */
export type OtherProgram = {
  enrollmentId: string;
  programSlug: string;
  programTitle: string;
  courseCount: number;
};

export default function OtherProgramsList({ programs }: { programs: OtherProgram[] }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (programs.length === 0) return null;

  async function setPrimary(enrollmentId: string) {
    setError(null);
    setSavingId(enrollmentId);
    try {
      const res = await fetch(`/api/member/enrollments/${enrollmentId}/set-primary`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Could not switch primary (HTTP ${res.status}).`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch primary.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section style={{ marginTop: '2rem' }} data-testid="other-programs-list">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-2)',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: '1.5rem', color: 'var(--color-blue)', '--ms-fill': 1 } as object}
        >
          category
        </span>
        <h2 className="portal-section-heading" style={{ margin: 0 }}>
          Other programs
        </h2>
      </div>
      <p
        style={{
          color: 'var(--color-on-surface-variant)',
          marginBottom: 'var(--space-4)',
        }}
      >
        You&apos;re also enrolled in {programs.length === 1 ? 'this program' : 'these programs'}.
        Switch your primary to make it the headline above.
      </p>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        {programs.map((p) => (
          <li
            key={p.enrollmentId}
            className="portal-card portal-card--flat"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '12rem' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{p.programTitle}</p>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.8125rem',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {p.courseCount} course{p.courseCount === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPrimary(p.enrollmentId)}
              disabled={savingId === p.enrollmentId}
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.85rem' }}
              aria-busy={savingId === p.enrollmentId}
            >
              <span aria-live="polite">
                {savingId === p.enrollmentId ? 'Switching…' : 'Switch primary'}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p
          role="alert"
          style={{
            marginTop: '0.5rem',
            color: 'var(--color-accent)',
            fontSize: '0.8125rem',
          }}
        >
          {error}
        </p>
      )}
    </section>
  );
}
