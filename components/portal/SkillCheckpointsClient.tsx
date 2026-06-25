'use client';

import { useState, useCallback } from 'react';
import type { ProgramCheckpointPack, CourseCheckpointSet, SkillCheckpoint } from '@/lib/content/checkpoints';
import { ALL_CHECKPOINT_PACKS } from '@/lib/content/checkpoints';
import ShareButton from '@/components/ui/ShareButton';
import { buildSkillCheckpointShare, getBrowserShareOrigin } from '@/lib/og/shareAchievementLinks';

type Step =
  | { kind: 'program' }
  | { kind: 'course'; pack: ProgramCheckpointPack }
  | { kind: 'quiz'; pack: ProgramCheckpointPack; course: CourseCheckpointSet; index: number; answers: Record<string, string>; revealed: boolean }
  | { kind: 'done'; pack: ProgramCheckpointPack; course: CourseCheckpointSet; correct: number; total: number };

function persistCheckpoint(payload: {
  checkpointId: string;
  programSlug: string;
  courseSlug: string;
  passed: boolean;
}) {
  // Fire-and-forget — we don't block UX on this
  fetch('/api/member/skill-checkpoints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silently swallow — non-critical persistence
  });
}

function ProofCard({
  course,
  pack,
  correct,
  total,
}: {
  course: CourseCheckpointSet;
  pack: ProgramCheckpointPack;
  correct: number;
  total: number;
}) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const demonstrated = course.checkpoints.map((cp) => cp.demonstratedSkill);
  const shareSkill = demonstrated[0] ?? course.courseName;
  const share = buildSkillCheckpointShare({
    origin: getBrowserShareOrigin(),
    skillName: shareSkill,
    programTitle: pack.programTitle,
    courseName: course.courseName,
    correct,
    total,
  });

  return (
    <div
      style={{
        border: '2px solid var(--color-accent, #1a73e8)',
        borderRadius: 16,
        padding: '1.5rem',
        background: 'var(--surface-container-low)',
        marginBottom: '1.25rem',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span
          className="material-symbols-outlined" aria-hidden="true"
          style={{ fontSize: 28, color: 'var(--color-accent, #1a73e8)', fontVariationSettings: "'FILL' 1" }}
        >
          verified
        </span>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent, #1a73e8)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Skill Demonstrated
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-on-surface)', lineHeight: 1.25 }}>
            {course.courseName}
          </div>
        </div>
      </div>

      {/* Score */}
      <div style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}>
        {correct} of {total} correct · {pack.programTitle}
      </div>

      {/* Skills chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
        {demonstrated.map((skill) => (
          <span
            key={skill}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              background: 'var(--color-accent-container, #d2e3fc)',
              color: 'var(--color-on-accent-container, #0d3277)',
              borderRadius: 20,
              padding: '0.25rem 0.65rem',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <span
              className="material-symbols-outlined" aria-hidden="true"
              style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            {skill}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', borderTop: '1px solid var(--surface-container-high)', paddingTop: '0.75rem' }}>
        Verified by WorkforceAP · {today}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ShareButton url={share.url} title={share.title} text={share.text} />
      </div>
    </div>
  );
}

export default function SkillCheckpointsClient({ userId: _userId }: { userId: string }) {
  const [step, setStep] = useState<Step>({ kind: 'program' });

  // ─── Step 0: Program picker ───────────────────────────────────────────────
  const renderProgramPicker = () => (
    <div>
      <p style={{ fontSize: '0.9rem', color: 'var(--color-on-surface-variant)', marginBottom: '1.25rem' }}>
        Pick a program track. You&rsquo;ll choose a specific course next, then answer a few short workplace scenarios.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.75rem',
        }}
      >
        {ALL_CHECKPOINT_PACKS.map((pack) => (
          <button
            key={pack.programSlug}
            className="portal-card"
            onClick={() => setStep({ kind: 'course', pack })}
            aria-label={`Select ${pack.programTitle}`}
            style={{
              textAlign: 'left',
              padding: '1rem',
              borderRadius: 12,
              border: '1px solid var(--surface-container-high)',
              background: 'var(--surface-container)',
              cursor: 'pointer',
              minHeight: 44,
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-on-surface)', marginBottom: '0.4rem' }}>
              {pack.programTitle}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
              {pack.whyItMatters}
            </div>
            <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--color-accent, #1a73e8)', fontWeight: 500 }}>
              {pack.courses.length} course{pack.courses.length !== 1 ? 's' : ''} →
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Step 1: Course picker ────────────────────────────────────────────────
  const renderCoursePicker = (pack: ProgramCheckpointPack) => (
    <div>
      <button
        onClick={() => setStep({ kind: 'program' })}
        aria-label="Back to programs"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontSize: '0.82rem',
          color: 'var(--color-accent, #1a73e8)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 0.75rem',
          minHeight: 44,
        }}
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>arrow_back</span>
        Back to programs
      </button>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>{pack.programTitle}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>{pack.whyItMatters}</div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
        Pick a course to verify. You&rsquo;ll answer a few short scenarios — takes about 3–5 minutes.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {pack.courses.map((course) => (
          <button
            key={course.courseSlug}
            className="portal-card"
            onClick={() =>
              setStep({ kind: 'quiz', pack, course, index: 0, answers: {}, revealed: false })
            }
            aria-label={`Select ${course.courseName}`}
            style={{
              textAlign: 'left',
              padding: '0.85rem 1rem',
              borderRadius: 10,
              border: '1px solid var(--surface-container-high)',
              background: 'var(--surface-container)',
              cursor: 'pointer',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-on-surface)' }}>
                {course.courseName}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '0.15rem' }}>
                {course.checkpoints.length} checkpoint{course.checkpoints.length !== 1 ? 's' : ''}
              </div>
            </div>
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20, color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
              chevron_right
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Step 2: Quiz ─────────────────────────────────────────────────────────
  const renderQuiz = useCallback(
    (state: Extract<Step, { kind: 'quiz' }>) => {
      const { pack, course, index, answers, revealed } = state;
      const cp: SkillCheckpoint = course.checkpoints[index];
      const selected = answers[cp.id];
      const isCorrect = selected === cp.correctOptionId;

      const handleSelect = (optId: string) => {
        if (revealed) return;
        const newAnswers = { ...answers, [cp.id]: optId };
        setStep({ ...state, answers: newAnswers, revealed: true });
        // Persist immediately on answer (fire-and-forget)
        persistCheckpoint({
          checkpointId: cp.id,
          programSlug: pack.programSlug,
          courseSlug: course.courseSlug,
          passed: optId === cp.correctOptionId,
        });
      };

      const handleNext = () => {
        if (index + 1 >= course.checkpoints.length) {
          // Calculate score
          const allAnswers = { ...answers, [cp.id]: selected ?? '' };
          const correct = course.checkpoints.filter(
            (c) => allAnswers[c.id] === c.correctOptionId
          ).length;
          setStep({ kind: 'done', pack, course, correct, total: course.checkpoints.length });
        } else {
          setStep({ kind: 'quiz', pack, course, index: index + 1, answers, revealed: false });
        }
      };

      const progressPct = Math.round(((index) / course.checkpoints.length) * 100);

      return (
        <div>
          {/* Back */}
          <button
            onClick={() => setStep({ kind: 'course', pack })}
            aria-label={`Back to ${course.courseName}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.82rem',
              color: 'var(--color-accent, #1a73e8)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 0.75rem',
              minHeight: 44,
            }}
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>arrow_back</span>
            {course.courseName}
          </button>

          {/* Progress bar */}
          <div
            style={{
              height: 4,
              background: 'var(--surface-container-high)',
              borderRadius: 4,
              marginBottom: '1.25rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--color-accent, #1a73e8)',
                borderRadius: 4,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
            Checkpoint {index + 1} of {course.checkpoints.length}
          </div>

          {/* Scenario card */}
          <div
            className="portal-card portal-card--flat"
            style={{
              padding: '1rem',
              borderRadius: 12,
              background: 'var(--surface-container)',
              marginBottom: '1rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.1rem' }}>📋</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>
                Scenario
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-on-surface)', lineHeight: 1.6 }}>
                {cp.scenario}
              </div>
            </div>
          </div>

          {/* Question */}
          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-on-surface)', marginBottom: '0.75rem', lineHeight: 1.45 }}>
            {cp.question}
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {cp.options.map((opt) => {
              const isSelected = selected === opt.id;
              const isRight = opt.id === cp.correctOptionId;
              let bgColor = 'var(--surface-container)';
              let borderColor = 'var(--surface-container-high)';
              let textColor = 'var(--color-on-surface)';

              if (revealed) {
                if (isRight) {
                  bgColor = 'var(--color-success-container, #d4edda)';
                  borderColor = 'var(--color-success, #28a745)';
                  textColor = 'var(--color-on-success-container, #155724)';
                } else if (isSelected && !isRight) {
                  bgColor = 'var(--color-error-container, #fde8e8)';
                  borderColor = 'var(--color-error, #d32f2f)';
                  textColor = 'var(--color-on-error-container, #7f1d1d)';
                }
              } else if (isSelected) {
                borderColor = 'var(--color-accent, #1a73e8)';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={revealed}
                  aria-label={opt.text}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    borderRadius: 10,
                    border: `2px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    cursor: revealed ? 'default' : 'pointer',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isSelected || (revealed && isRight) ? borderColor : 'var(--surface-container-high)',
                      color: isSelected || (revealed && isRight) ? '#fff' : 'var(--color-on-surface-variant)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {opt.id.toUpperCase()}
                  </span>
                  {opt.text}
                  {revealed && isRight && (
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18, marginLeft: 'auto', fontVariationSettings: "'FILL' 1", color: 'var(--color-success, #28a745)' }}>
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {revealed && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: isCorrect
                  ? 'var(--color-success-container, #d4edda)'
                  : 'var(--color-error-container, #fde8e8)',
                border: `1px solid ${isCorrect ? 'var(--color-success, #28a745)' : 'var(--color-error, #d32f2f)'}`,
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: isCorrect ? 'var(--color-on-success-container, #155724)' : 'var(--color-on-error-container, #7f1d1d)',
                  marginBottom: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
                  {isCorrect ? 'check_circle' : 'cancel'}
                </span>
                {isCorrect ? 'Correct' : 'Not quite'}
              </div>
              <div style={{ fontSize: '0.83rem', lineHeight: 1.55, color: isCorrect ? 'var(--color-on-success-container, #155724)' : 'var(--color-on-error-container, #7f1d1d)' }}>
                {cp.explanation}
              </div>
            </div>
          )}

          {/* Next button */}
          {revealed && (
            <button
              onClick={handleNext}
              aria-label={index + 1 >= course.checkpoints.length ? 'See my results' : 'Next checkpoint'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.7rem 1.25rem',
                background: 'var(--color-accent, #1a73e8)',
                color: '#fff',
                borderRadius: 8,
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              {index + 1 >= course.checkpoints.length ? 'See my results' : 'Next checkpoint'}
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          )}
        </div>
      );
    },
    []
  );

  // ─── Step 3: Done / completion card ───────────────────────────────────────
  const renderDone = (state: Extract<Step, { kind: 'done' }>) => {
    const { pack, course, correct, total } = state;

    return (
      <div>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '0.25rem' }}>
            Skills demonstrated
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
            You answered {correct} of {total} correctly.
          </div>
        </div>

        <ProofCard course={course} pack={pack} correct={correct} total={total} />

        <button
          onClick={() => setStep({ kind: 'course', pack })}
          aria-label="Try another course"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.65rem 1rem',
            background: 'var(--surface-container)',
            color: 'var(--color-on-surface)',
            borderRadius: 8,
            border: '1px solid var(--surface-container-high)',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>replay</span>
          Try another course
        </button>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  switch (step.kind) {
    case 'program':
      return renderProgramPicker();
    case 'course':
      return renderCoursePicker(step.pack);
    case 'quiz':
      return renderQuiz(step);
    case 'done':
      return renderDone(step);
  }
}
