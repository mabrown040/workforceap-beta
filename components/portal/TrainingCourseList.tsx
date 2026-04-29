'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProgramCourse } from '@/lib/content/programs';

type TrainingCourseListProps = {
  courses: ProgramCourse[];
  completedSlugs: string[];
  programSlug?: string;
};

export default function TrainingCourseList({ courses, completedSlugs }: TrainingCourseListProps) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const completedSet = new Set(completedSlugs);

  const getStatus = (slug: string): 'complete' | 'in_progress' | 'not_started' => {
    if (completedSet.has(slug)) return 'complete';
    return 'not_started';
  };

  const handleMarkComplete = async (slug: string) => {
    setMarking(slug);
    setMarkError(null);
    try {
      const res = await fetch('/api/member/courses/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseSlug: slug }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setMarkError(data.error ?? 'Could not mark course complete. Please try again.');
      }
    } catch {
      setMarkError('Could not mark course complete. Please try again.');
    } finally {
      setMarking(null);
    }
  };

  const firstNotStartedSlug = courses.find((c) => !completedSet.has(c.slug))?.slug ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {markError && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(200, 50, 50, 0.08)',
            border: '1px solid rgba(200, 50, 50, 0.25)',
            color: 'var(--color-error, #c83232)',
            fontSize: '0.9rem',
          }}
        >
          {markError}
        </div>
      )}
      {courses.map((c) => {
        const status = getStatus(c.slug);
        const isComplete = status === 'complete';
        const isUpNext = !isComplete && c.slug === firstNotStartedSlug;
        return (
          <div
            key={c.slug}
            data-course-slug={c.slug}
            data-course-id={c.courseraCourseId ?? undefined}
            className={`training-course-card${isUpNext ? ' training-course-card--up-next' : ''}`}
            style={{
              padding: '1.25rem',
              border: '1px solid var(--outline-variant)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 className="training-course-card__title" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>
                {c.name}
              </h3>
              {/* "est. X hrs" — these are program-level defaults, not real
                  per-course Coursera data (audit #67). The prefix sets
                  honest expectations until per-course hours come from the
                  Coursera Admin API. */}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>est. {c.estimatedHours} hrs</span>
              {isUpNext ? (
                <span className="training-course-up-next" style={{ display: 'block', marginTop: '0.35rem' }}>
                  Up next →
                </span>
              ) : null}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '4px',
                  background: isComplete
                    ? 'rgba(74, 155, 79, 0.15)'
                    : isUpNext
                      ? 'rgba(173, 44, 77, 0.12)'
                      : '#f0f0f0',
                  color: isComplete ? 'var(--color-accent)' : isUpNext ? 'var(--color-accent)' : 'var(--color-on-surface-variant)',
                  fontWeight: isUpNext ? 600 : 400,
                }}
              >
                {isComplete ? 'Complete' : 'Not Started'}
              </span>
              <a
                href={`https://www.coursera.org/learn/${encodeURIComponent(c.slug)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Open in Coursera
              </a>
              {!isComplete && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                  onClick={() => handleMarkComplete(c.slug)}
                  disabled={!!marking}
                >
                  {marking === c.slug ? '...' : 'Mark Complete'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
