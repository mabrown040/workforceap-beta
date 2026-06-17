'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TrackedCourseraLaunchLink from '@/components/portal/TrackedCourseraLaunchLink';
import type { CourseProgressStatus } from '@prisma/client';
import type { ProgramCourse } from '@/lib/content/programs';

export type CourseProgressUi = {
  status: CourseProgressStatus;
  percentComplete: number;
  /** Coursera course grade (0–100) when stored as `score_scaled` / synced. */
  gradePercent?: number | null;
};

type TrainingCourseListProps = {
  courses: ProgramCourse[];
  completedSlugs: string[];
  programSlug?: string;
  /** When set, overrides status/percent from `completedSlugs` alone (xAPI + stored progress). */
  progressBySlug?: Record<string, CourseProgressUi>;
  /**
   * Eligibility gate for the new "Enroll in this course" CTA. When false
   * (the default for new members until counselor / admin approval), the
   * Enroll button is replaced by a locked-state explanation. The server
   * also re-checks this — the prop is purely for UI conditional render.
   */
  eligibilityApproved?: boolean;
  /**
   * Set of Coursera courseIds (NOT slugs) the learner is currently
   * enrolled in on Coursera. Used to hide "Enroll" for courses already
   * enrolled and surface the existing "Continue Learning" CTA instead.
   */
  enrolledCourseraCourseIds?: string[];
};

function chipClass(status: 'complete' | 'in_progress' | 'not_started', isUpNext: boolean): string {
  if (status === 'complete') return 'training-status-chip training-status-chip--complete';
  if (status === 'in_progress') return 'training-status-chip training-status-chip--progress';
  if (isUpNext) return 'training-status-chip training-status-chip--up-next';
  return 'training-status-chip training-status-chip--pending';
}

function formatGradeLine(pct: number): string {
  const rounded = Math.round(pct * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

export default function TrainingCourseList({
  courses,
  completedSlugs,
  progressBySlug,
  eligibilityApproved = false,
  enrolledCourseraCourseIds = [],
}: TrainingCourseListProps) {
  const router = useRouter();
  const [marking, setMarking] = useState<string | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  /** Course slug currently being enrolled (button → "Enrolling…"). */
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [enrollNotice, setEnrollNotice] = useState<{
    kind: 'success' | 'invited' | 'error';
    message: string;
  } | null>(null);
  /** Open when the state machine returned `status: 'invited'`. */
  const [invitedModalOpen, setInvitedModalOpen] = useState(false);
  const completedSet = new Set(completedSlugs);
  const enrolledCourseraSet = new Set(enrolledCourseraCourseIds);

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

  const handleEnroll = async (course: ProgramCourse) => {
    if (!course.courseraCourseId) {
      setEnrollNotice({
        kind: 'error',
        message: "This course isn't linked to Coursera yet. Try again later.",
      });
      return;
    }
    setEnrolling(course.slug);
    setEnrollNotice(null);
    try {
      const res = await fetch('/api/member/coursera/enroll-in-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseraCourseId: course.courseraCourseId }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        status?: string;
        message?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        // Server-side eligibility refusal. The button shouldn't have been
        // visible — but if a stale tab was cached, this is the safety net.
        const msg =
          payload.code === 'NOT_APPROVED'
            ? 'Enrollment is locked. Your counselor will enable this when funding is confirmed.'
            : payload.error ?? 'Could not enroll. Please try again.';
        setEnrollNotice({ kind: 'error', message: msg });
        return;
      }
      if (payload.status === 'invited') {
        setInvitedModalOpen(true);
        setEnrollNotice({
          kind: 'invited',
          message:
            payload.message ?? 'Check your email — Coursera sent an invite.',
        });
        return;
      }
      // 'enrolled', 'membership-created-and-enrolled', or 'already-enrolled':
      // refetch to pull the latest progress (including the seeded
      // CourseProgress rows the server's auto-sync may have just created).
      setEnrollNotice({
        kind: 'success',
        message: payload.message ?? 'Enrolled.',
      });
      router.refresh();
    } catch {
      setEnrollNotice({
        kind: 'error',
        message: 'Could not reach the server. Check your connection and try again.',
      });
    } finally {
      setEnrolling(null);
    }
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
      return pct != null && pct > 0 ? `${pct}% complete` : 'In progress';
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
      {enrollNotice && (
        <div
          role={enrollNotice.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            background:
              enrollNotice.kind === 'error'
                ? 'rgba(200, 50, 50, 0.08)'
                : enrollNotice.kind === 'invited'
                  ? 'rgba(43,123,185,0.08)'
                  : 'rgba(74,155,79,0.08)',
            border:
              enrollNotice.kind === 'error'
                ? '1px solid rgba(200, 50, 50, 0.25)'
                : enrollNotice.kind === 'invited'
                  ? '1px solid rgba(43,123,185,0.25)'
                  : '1px solid rgba(74,155,79,0.25)',
            color:
              enrollNotice.kind === 'error'
                ? 'var(--color-error, #c83232)'
                : 'var(--color-on-surface)',
            fontSize: '0.9rem',
          }}
        >
          {enrollNotice.message}
        </div>
      )}
      {invitedModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="enroll-invited-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
          onClick={() => setInvitedModalOpen(false)}
        >
          <div
            style={{
              maxWidth: '28rem',
              background: 'var(--color-surface, #fff)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              padding: '1.5rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="enroll-invited-title" style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>
              Check your email
            </h3>
            <p style={{ margin: '0 0 1rem', lineHeight: 1.5, fontSize: '0.95rem' }}>
              We&apos;ve asked Coursera to send you an invitation. Open the email,
              accept the invite, finish creating your Coursera account, then come
              back here and click <strong>Enroll</strong> again to start the course.
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
              No email after a few minutes? Check spam, or message your counselor — we
              can resend the invite.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setInvitedModalOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
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
        const gradePct = progressBySlug?.[c.slug]?.gradePercent;
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
              {isComplete ? (
                <>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      margin: '0 0 0.25rem',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    100% complete
                  </p>
                  <div className="training-course-progress">
                    <div className="training-course-progress__track" role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} progress`}>
                      <div className="training-course-progress__fill training-course-progress__fill--complete" style={{ width: '100%' }} />
                    </div>
                  </div>
                </>
              ) : showBar ? (
                <>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      margin: '0 0 0.25rem',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    {pct}% complete
                  </p>
                  <div className="training-course-progress">
                    <div className="training-course-progress__track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} progress`}>
                      <div className="training-course-progress__fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      margin: '0 0 0.25rem',
                      color: 'var(--color-on-surface-variant)',
                    }}
                  >
                    0% complete
                  </p>
                  <div className="training-course-progress">
                    <div className="training-course-progress__track" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} progress`}>
                      <div className="training-course-progress__fill" style={{ width: '0%' }} />
                    </div>
                  </div>
                </>
              )}
              {gradePct != null && Number.isFinite(gradePct) ? (
                <p
                  style={{
                    fontSize: '0.78rem',
                    marginTop: '0.35rem',
                    marginBottom: 0,
                    color: 'var(--color-on-surface-variant)',
                  }}
                >
                  Grade: {formatGradeLine(gradePct)}% (Coursera)
                </p>
              ) : null}
            </div>
            <div className="training-course-card__actions">
              <span className={chipClass(status, isUpNext)}>{statusLabel(c.slug)}</span>
              {/* Enroll / Continue / Locked tri-state. The B4B "Enroll" path is
                  gated behind three checks:
                    1. eligibilityApproved — server-truth flag, hides button
                       entirely for unapproved members.
                    2. enrolledCourseraSet — once enrolled on Coursera the
                       Continue button is the right CTA, not Enroll.
                    3. status/pct — if the learner already has progress
                       (status='in_progress' OR percentComplete > 0), they're
                       effectively studying the course already; B4B sometimes
                       still rejects Enroll calls in that state with
                       "Cannot find courses" because the course isn't in this
                       org's B4B program (the user reached it via direct
                       Coursera access). Showing the Enroll button there
                       produces a 400 error banner on click. Treat any real
                       progress as enrolled for UI purposes.
                  Already-complete courses skip all of this — they get the
                  existing "Open in Coursera" review link. */}
              {!isComplete &&
              c.courseraCourseId &&
              !enrolledCourseraSet.has(c.courseraCourseId) &&
              status === 'not_started' &&
              (pct ?? 0) === 0 ? (
                eligibilityApproved ? (
                  <button
                    type="button"
                    className="btn btn-primary training-course-cta-primary"
                    data-course-slug={c.slug}
                    data-course-id={c.courseraCourseId}
                    onClick={() => handleEnroll(c)}
                    disabled={enrolling !== null}
                    aria-busy={enrolling === c.slug}
                    aria-label={
                      enrolling === c.slug
                        ? `Enrolling in ${c.name}`
                        : `Enroll in this course: ${c.name}`
                    }
                  >
                    {enrolling === c.slug ? 'Enrolling…' : 'Enroll in this course'}
                  </button>
                ) : (
                  <span
                    className="training-course-locked"
                    role="note"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-md, 0.5rem)',
                      background: 'rgba(0,0,0,0.04)',
                      border: '1px dashed rgba(0,0,0,0.18)',
                      fontSize: '0.85rem',
                      color: 'var(--color-on-surface-variant)',
                      maxWidth: '22rem',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '1rem' }}
                      aria-hidden="true"
                    >
                      lock
                    </span>
                    Enrollment locked — your counselor will enable this when
                    funding is confirmed.
                  </span>
                )
              ) : (
                <TrackedCourseraLaunchLink
                  href={`/api/member/coursera/launch?course=${encodeURIComponent(c.slug)}`}
                  className="btn btn-primary training-course-cta-primary"
                  aria-label={`${primaryCta}: ${c.name} (opens in a new tab)`}
                  courseSlug={c.slug}
                >
                  {primaryCta}
                </TrackedCourseraLaunchLink>
              )}
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
