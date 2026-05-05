'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TrackedCourseraLaunchLink from '@/components/portal/TrackedCourseraLaunchLink';
import type { CourseProgressStatus } from '@prisma/client';
import type { ProgramCourse } from '@/lib/content/programs';

export type CourseProgressUi = {
  status: CourseProgressStatus;
  percentComplete: number;
};

type TrainingCourseListProps = {
  courses: ProgramCourse[];
  completedSlugs: string[];
  programSlug?: string;
  /** When set, overrides status/percent from `completedSlugs` alone (xAPI + stored progress). */
  progressBySlug?: Record<string, CourseProgressUi>;
};

function chipClass(status: 'complete' | 'in_progress' | 'not_started', isUpNext: boolean): string {
  if (status === 'complete') return 'training-status-chip training-status-chip--complete';
  if (status === 'in_progress') return 'training-status-chip training-status-chip--progress';
  if (isUpNext) return 'training-status-chip training-status-chip--up-next';
  return 'training-status-chip training-status-chip--pending';
}

export default function TrainingCourseList({
  courses,
  completedSlugs,
  progressBySlug,
}: TrainingCourseListProps) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const completedSet = new Set(completedSlugs);

  const getStatus = (slug: string): 'complete' | 'in_progress' | 'not_started' => {
    const row = progressBySlug?.[slug];
    if (row) {
      if (row.status === 'COMPLETED') return 'complete';
      if (row.status === 'IN_PROGRESS') return 'in_progress';
      return 'not_started';
    }
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

  const firstNotStartedSlug = courses.find((c) => getStatus(c.slug) !== 'complete')?.slug ?? null;

  const statusLabel = (slug: string) => {
    const s = getStatus(slug);
    if (s === 'complete') return 'Complete';
    if (s === 'in_progress') {
      const pct = progressBySlug?.[slug]?.percentComplete;
      return pct != null && pct > 0 ? `In progress (${pct}%)` : 'In progress';
    }
    return 'Not started';
  };

  if (courses.length === 0) {
    return (
      <div className="training-empty-courses" role="status" aria-live="polite">
        <p className="training-empty-courses__text">No courses are listed for this program yet.</p>
      </div>
    );
  }

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
        const pct = progressBySlug?.[c.slug]?.percentComplete;
        const showBar = !isComplete && pct != null && pct > 0 && pct < 100;
        const primaryCta =
          isUpNext || status === 'in_progress' ? 'Continue in Coursera' : 'Open in Coursera';

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
            }}
          >
            <div className="training-course-card__main">
              <h3 className="training-course-card__title" style={{ fontSize: '1.05rem', margin: '0 0 0.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {c.name}
              </h3>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
                est. {c.estimatedHours} hrs
              </span>
              {isUpNext ? (
                <span className="training-course-up-next" style={{ display: 'block', marginTop: '0.35rem' }}>
                  Up next →
                </span>
              ) : null}
              {showBar ? (
                <div className="training-course-progress">
                  <div className="training-course-progress__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} progress`}>
                    <div className="training-course-progress__fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ) : null}
            </div>
            <div className="training-course-card__actions">
              <span className={chipClass(status, isUpNext)}>{statusLabel(c.slug)}</span>
              <TrackedCourseraLaunchLink
                href={`/api/member/coursera/launch?course=${encodeURIComponent(c.slug)}`}
                className="btn btn-primary training-course-cta-primary"
                aria-label={`${primaryCta}: ${c.name} (opens in a new tab)`}
                courseSlug={c.slug}
              >
                {primaryCta}
              </TrackedCourseraLaunchLink>
              {!isComplete && (
                <button
                  type="button"
                  className="btn btn-outline"
                  data-course-slug={c.slug}
                  data-course-id={c.courseraCourseId ?? undefined}
                  onClick={() => handleMarkComplete(c.slug)}
                  disabled={!!marking}
                  aria-busy={marking === c.slug}
                  aria-label={marking === c.slug ? `Saving completion for ${c.name}` : `Mark ${c.name} complete`}
                >
                  {marking === c.slug ? 'Saving…' : 'Mark complete'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
