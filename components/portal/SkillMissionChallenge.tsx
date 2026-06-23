'use client';

import { useState, useCallback } from 'react';

// ── Local type copies (server-only lib not importable here) ──────────────────

type MissionStatus = 'locked' | 'ready' | 'passed' | 'needs_retry';

type MissionResult = {
  verdict: 'passed' | 'needs_retry';
  coachingNote: string;
  starStory: string;
  resumeBullet: string;
  skillsUnlocked: string[];
};

/* Answers never ship to the client — the quiz-check endpoint grades each
   answer and returns the explanation after the student commits. */
type QuizQuestion = {
  text: string;
  options: [string, string, string, string];
};

type QuizCheckResponse = {
  correct: boolean;
  correctIndex: number;
  explanation: string;
};

type SkillMissionSummaryItem = {
  key: string;
  courseSlug: string;
  programSlug: string;
  programTitle: string;
  courseTitle: string;
  missionName: string;
  missionTagline: string;
  primaryAxis: string;
  skillLabels: string[];
  scenarioPrompt: string;
  evidenceHint: string;
  quizQuestions: QuizQuestion[];
  estimatedMinutes: number;
  status: MissionStatus;
  completedAt: Date | null;
  latestResult: MissionResult | null;
  aiToolResultId: string | null;
};

type MissionEvalResponse =
  | {
      ok: true;
      verdict: 'passed' | 'needs_retry';
      coachingNote: string;
      starStory: string;
      resumeBullet: string;
      skillsUnlocked: string[];
      quizCorrectCount: number;
      aiToolResultId: string | null;
    }
  | { ok: false; error: string };

/* `correct` is local display state derived from the server's quiz-check
   response — only questionIndex/selectedIndex are sent to evaluate. */
type QuizAnswer = {
  questionIndex: number;
  selectedIndex: number;
  correct: boolean;
};

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  mission: SkillMissionSummaryItem;
  onClose: () => void;
  onComplete: (result: MissionEvalResponse & { ok: true }) => void;
};

// ── Shared style tokens ───────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  position: 'relative',
  background: 'var(--color-surface, #fff)',
  borderRadius: 'var(--radius-xl, 1rem)',
  padding: '2rem',
  width: '100%',
  maxWidth: '600px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 24px 64px rgba(0,0,0,0.24)',
};

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,0.58)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close mission"
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'none',
        border: '1px solid var(--outline-variant)',
        borderRadius: '0.4rem',
        cursor: 'pointer',
        color: 'var(--color-on-surface-variant)',
        fontSize: '1rem',
        lineHeight: 1,
        padding: '0.4rem 0.6rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ✕
    </button>
  );
}

function SkillChip({ label, green }: { label: string; green?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.55rem',
        borderRadius: '9999px',
        background: green ? 'rgba(74,155,79,0.12)' : 'var(--surface-container-high, rgba(0,0,0,0.06))',
        border: green ? '1px solid rgba(74,155,79,0.22)' : '1px solid var(--outline-variant)',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: green ? '#256b2a' : 'var(--color-on-surface-variant)',
      }}
    >
      {label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        });
      }}
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      style={{
        marginTop: '0.4rem',
        background: 'none',
        border: '1px solid var(--outline-variant)',
        borderRadius: '0.4rem',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--color-on-surface-variant)',
        padding: '0.3rem 0.65rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}
    >
      {copied ? '✓ Copied!' : '📋 Copy'}
    </button>
  );
}

// ── Phase 0: Mission Intro ────────────────────────────────────────────────────

function PhaseIntro({ mission, onAccept, onClose }: { mission: SkillMissionSummaryItem; onAccept: () => void; onClose: () => void }) {
  const scenarioPreview = mission.scenarioPrompt.length > 100
    ? mission.scenarioPrompt.slice(0, 100) + '…'
    : mission.scenarioPrompt;

  return (
    <div style={CARD_STYLE}>
      <CloseButton onClick={onClose} />

      <p
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)',
          margin: '0 0 0.5rem',
        }}
      >
        Skill Mission
      </p>
      <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.2, paddingRight: '2rem' }}>
        {mission.missionName}
      </h2>
      <p style={{ margin: '0 0 1rem', fontSize: '0.95rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
        {mission.missionTagline}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '9999px',
            background: 'var(--surface-container-high, rgba(0,0,0,0.06))',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-on-surface-variant)',
          }}
        >
          ⏱ ~{mission.estimatedMinutes} min
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.3rem 0.65rem',
            borderRadius: '9999px',
            background: 'var(--surface-container-high, rgba(0,0,0,0.06))',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--color-on-surface-variant)',
          }}
        >
          📝 3 quiz questions + scenario
        </span>
      </div>

      {mission.skillLabels.length > 0 && (
        <div style={{ marginBottom: '1.1rem' }}>
          <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
            Skills you&apos;ll prove:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {mission.skillLabels.slice(0, 4).map((s) => (
              <SkillChip key={s} label={s} />
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          padding: '0.85rem 1rem',
          borderRadius: '0.7rem',
          background: 'var(--surface-container, rgba(0,0,0,0.04))',
          border: '1px solid var(--outline-variant)',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ margin: '0 0 0.3rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
          What you&apos;ll prove:
        </p>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-on-surface)', lineHeight: 1.55, fontStyle: 'italic' }}>
          &ldquo;{scenarioPreview}&rdquo;
        </p>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={onAccept}
        style={{ fontSize: '0.95rem', padding: '0.7rem 1.5rem' }}
      >
        Accept Mission →
      </button>
    </div>
  );
}

// ── Phase 1: Quiz ─────────────────────────────────────────────────────────────

function PhaseQuiz({
  mission,
  onFinish,
  onClose,
}: {
  mission: SkillMissionSummaryItem;
  onFinish: (answers: QuizAnswer[]) => void;
  onClose: () => void;
}) {
  const questions = mission.quizQuestions.slice(0, 3);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedThisQ, setSelectedThisQ] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<QuizCheckResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const question = questions[currentQ];
  const isAnswered = feedback !== null;
  const isLast = currentQ === questions.length - 1;

  async function handleSelect(idx: number) {
    if (selectedThisQ !== null || checking) return;
    setSelectedThisQ(idx);
    setChecking(true);
    setCheckError(null);
    try {
      const res = await fetch(
        `/api/skill-missions/${encodeURIComponent(mission.courseSlug)}/quiz-check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            missionKey: mission.key,
            questionIndex: currentQ,
            selectedIndex: idx,
          }),
        },
      );
      if (!res.ok) throw new Error('check failed');
      const data = (await res.json()) as QuizCheckResponse;
      setFeedback(data);
      setAnswers((prev) => [
        ...prev,
        { questionIndex: currentQ, selectedIndex: idx, correct: data.correct },
      ]);
    } catch {
      setSelectedThisQ(null);
      setCheckError('Could not check your answer — tap to try again.');
    } finally {
      setChecking(false);
    }
  }

  function handleNext() {
    if (isLast) {
      onFinish(answers);
    } else {
      setCurrentQ((q) => q + 1);
      setSelectedThisQ(null);
      setFeedback(null);
    }
  }

  return (
    <div style={CARD_STYLE}>
      <CloseButton onClick={onClose} />

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Question {currentQ + 1}/{questions.length}
        </p>
        <div style={{ flex: 1, height: '4px', borderRadius: '9999px', background: 'var(--outline-variant)' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '9999px',
              background: 'var(--color-accent)',
              width: `${((currentQ + (isAnswered ? 1 : 0)) / questions.length) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      <h3 style={{ margin: '0 0 1.1rem', fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.4, paddingRight: '1.5rem' }}>
        {question.text}
      </h3>

      {/* Options */}
      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        {question.options.map((opt, idx) => {
          const isCorrect = feedback !== null && idx === feedback.correctIndex;
          const isSelected = selectedThisQ === idx;

          let bg = 'var(--surface-container, rgba(0,0,0,0.04))';
          let border = '1px solid var(--outline-variant)';
          let color = 'var(--color-on-surface)';

          if (isAnswered) {
            if (isCorrect) {
              bg = 'rgba(74,155,79,0.12)';
              border = '1.5px solid rgba(74,155,79,0.5)';
              color = '#256b2a';
            } else if (isSelected && !isCorrect) {
              bg = 'rgba(194,60,60,0.1)';
              border = '1.5px solid rgba(194,60,60,0.4)';
              color = '#892020';
            }
          } else if (isSelected) {
            bg = 'color-mix(in srgb, var(--color-accent) 10%, white)';
            border = '1.5px solid var(--color-accent)';
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => void handleSelect(idx)}
              disabled={isAnswered || checking}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.65rem',
                background: bg,
                border,
                color,
                fontSize: '0.9rem',
                fontWeight: 500,
                textAlign: 'left',
                cursor: isAnswered ? 'default' : 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  background: isAnswered && isCorrect ? 'rgba(74,155,79,0.25)' : isAnswered && isSelected && !isCorrect ? 'rgba(194,60,60,0.2)' : 'var(--outline-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: isAnswered && isCorrect ? '#256b2a' : isAnswered && isSelected && !isCorrect ? '#892020' : 'var(--color-on-surface-variant)',
                }}
              >
                {isAnswered && isCorrect ? '✓' : isAnswered && isSelected && !isCorrect ? '✗' : String.fromCharCode(65 + idx)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Checking / error states */}
      {checking && (
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-on-surface-variant)' }}>
          Checking…
        </p>
      )}
      {checkError && (
        <p role="alert" style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-error, #c83232)' }}>
          {checkError}
        </p>
      )}

      {/* Explanation */}
      {feedback && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.65rem',
            background: feedback.correct ? 'rgba(74,155,79,0.08)' : 'rgba(194,120,0,0.08)',
            border: feedback.correct ? '1px solid rgba(74,155,79,0.2)' : '1px solid rgba(194,120,0,0.2)',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--color-on-surface)' }}>
            <strong>{feedback.correct ? '✅ Exactly right!' : '💡 Here\'s why:'}</strong>{' '}
            {feedback.explanation}
          </p>
        </div>
      )}

      {isAnswered && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleNext}
          style={{ fontSize: '0.9rem' }}
        >
          {isLast ? 'See how you did →' : 'Next →'}
        </button>
      )}
    </div>
  );
}

// ── Phase 2: Scenario Response ────────────────────────────────────────────────

function PhaseScenario({
  mission,
  quizAnswers,
  onSubmit,
  onBack,
  onClose,
}: {
  mission: SkillMissionSummaryItem;
  quizAnswers: QuizAnswer[];
  onSubmit: (response: string) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
}) {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
  const charCount = response.length;
  const correctCount = quizAnswers.filter((a) => a.correct).length;

  async function handleSubmit() {
    if (charCount < 20) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div style={CARD_STYLE}>
      <CloseButton onClick={onClose} />

      {/* Quiz score recap */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.3rem 0.7rem',
          borderRadius: '9999px',
          background: correctCount === 3 ? 'rgba(74,155,79,0.1)' : 'rgba(194,120,0,0.1)',
          border: correctCount === 3 ? '1px solid rgba(74,155,79,0.22)' : '1px solid rgba(194,120,0,0.22)',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: correctCount === 3 ? '#256b2a' : '#8a5a00',
          marginBottom: '1rem',
        }}
      >
        {correctCount === 3 ? '🎯' : '📚'} {correctCount}/3 quiz questions correct
      </div>

      <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', fontWeight: 800, paddingRight: '1.5rem' }}>
        Now show it in action
      </h3>
      <p style={{ margin: '0 0 1rem', fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.5 }}>
        Describe a real or realistic situation where you&apos;d apply these skills.
      </p>

      {/* Scenario blockquote */}
      <blockquote
        style={{
          margin: '0 0 1rem',
          padding: '0.85rem 1rem 0.85rem 1.25rem',
          borderLeft: '3px solid var(--color-accent)',
          background: 'color-mix(in srgb, var(--color-accent) 5%, var(--surface-container-low, rgba(0,0,0,0.03)))',
          borderRadius: '0 0.6rem 0.6rem 0',
          fontSize: '0.92rem',
          lineHeight: 1.65,
          color: 'var(--color-on-surface)',
          fontStyle: 'italic',
        }}
      >
        {mission.scenarioPrompt}
      </blockquote>

      {/* Textarea */}
      <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          rows={8}
          placeholder="Walk me through how you'd handle this... (aim for 150+ words)"
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            borderRadius: '0.65rem',
            border: '1.5px solid var(--outline-variant)',
            background: 'var(--surface-container-low, rgba(0,0,0,0.02))',
            fontSize: '0.9rem',
            lineHeight: 1.6,
            color: 'var(--color-on-surface)',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--outline-variant)'; }}
        />
      </div>

      {/* Word count */}
      <p
        style={{
          margin: '0 0 0.6rem',
          fontSize: '0.76rem',
          color: wordCount >= 150 ? '#256b2a' : wordCount >= 50 ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface-variant)',
          fontWeight: wordCount >= 150 ? 700 : 400,
        }}
      >
        {wordCount} words{wordCount >= 150 ? ' ✓ Great depth!' : wordCount >= 50 ? ' — keep going' : ''}
      </p>

      {/* Evidence hint */}
      <div
        style={{
          padding: '0.6rem 0.85rem',
          borderRadius: '0.55rem',
          background: 'var(--surface-container, rgba(0,0,0,0.04))',
          fontSize: '0.8rem',
          color: 'var(--color-on-surface-variant)',
          marginBottom: '1.25rem',
          lineHeight: 1.5,
        }}
      >
        <strong>Tip:</strong> {mission.evidenceHint}
      </div>

      {error && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderRadius: '0.55rem',
            background: 'rgba(194,60,60,0.08)',
            border: '1px solid rgba(194,60,60,0.25)',
            fontSize: '0.85rem',
            color: '#892020',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={charCount < 20 || loading}
          style={{
            fontSize: '0.9rem',
            opacity: charCount < 20 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '0.85rem',
                  height: '0.85rem',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
              Coaching in progress…
            </>
          ) : (
            'Submit for AI Coaching →'
          )}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: 'var(--color-on-surface-variant)',
            padding: '0.5rem',
            textDecoration: 'underline',
          }}
        >
          ← Back to quiz
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Phase 3: AI Coaching Result ───────────────────────────────────────────────

function PhaseResult({
  result,
  onContinue,
  onClose,
}: {
  result: MissionEvalResponse & { ok: true };
  onContinue: () => void;
  onClose: () => void;
}) {
  const passed = result.verdict === 'passed';

  return (
    <div style={CARD_STYLE}>
      <CloseButton onClick={onClose} />

      <h2
        style={{
          margin: '0 0 0.75rem',
          fontSize: '1.4rem',
          fontWeight: 900,
          color: passed ? '#256b2a' : '#8a5a00',
          paddingRight: '1.5rem',
        }}
      >
        {passed ? 'Mission Passed! 🎯' : 'Keep Going 💪'}
      </h2>

      {/* Coaching note */}
      <div
        style={{
          padding: '1rem',
          borderRadius: '0.7rem',
          background: passed ? 'rgba(74,155,79,0.07)' : 'rgba(194,120,0,0.07)',
          border: passed ? '1px solid rgba(74,155,79,0.2)' : '1px solid rgba(194,120,0,0.22)',
          marginBottom: '1.1rem',
        }}
      >
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--color-on-surface)' }}>
          {result.coachingNote}
        </p>
      </div>

      {passed && (
        <>
          {/* Skills unlocked */}
          {result.skillsUnlocked.length > 0 && (
            <div style={{ marginBottom: '1.1rem' }}>
              <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Skills you demonstrated:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {result.skillsUnlocked.map((s) => (
                  <SkillChip key={s} label={s} green />
                ))}
              </div>
            </div>
          )}

          {/* Resume bullet */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your Resume Bullet:
            </p>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                background: 'var(--surface-container, rgba(0,0,0,0.04))',
                border: '1px solid var(--outline-variant)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: 'var(--color-on-surface)',
                fontStyle: 'italic',
              }}
            >
              {result.resumeBullet}
            </div>
            <CopyButton text={result.resumeBullet} />
          </div>

          {/* STAR story */}
          <div style={{ marginBottom: '1.25rem' }}>
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Your STAR Story:
            </p>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                background: 'var(--surface-container, rgba(0,0,0,0.04))',
                border: '1px solid var(--outline-variant)',
                fontSize: '0.88rem',
                lineHeight: 1.7,
                color: 'var(--color-on-surface)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {result.starStory}
            </div>
            <CopyButton text={result.starStory} />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinue}
            aria-label="Continue"
            style={{ fontSize: '0.92rem' }}
          >
            Continue →
          </button>
        </>
      )}

      {!passed && (
        <>
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '0.65rem',
              background: 'var(--surface-container, rgba(0,0,0,0.04))',
              border: '1px solid var(--outline-variant)',
              marginBottom: '1.25rem',
            }}
          >
            <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
              What to review before retrying:
            </p>
            <p style={{ margin: 0, fontSize: '0.87rem', lineHeight: 1.6, color: 'var(--color-on-surface)' }}>
              Re-read your course materials, focusing on the core concepts tested in the quiz.
              When you write your scenario response, use the STAR method: Situation, Task, Action, Result.
              Aim for 150+ words with specific, concrete details.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{ fontSize: '0.9rem', background: '#8a5a00', borderColor: '#8a5a00' }}
          >
            Close &amp; Review
          </button>
        </>
      )}
    </div>
  );
}

// ── Phase 4: Celebration ──────────────────────────────────────────────────────

function PhaseCelebration({
  result,
  onComplete,
}: {
  result: MissionEvalResponse & { ok: true };
  onComplete: () => void;
}) {
  return (
    <div
      style={{
        ...CARD_STYLE,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-on-surface)' }}>
        Career proof unlocked!
      </h2>
      <p style={{ margin: '0 0 1.5rem', fontSize: '0.92rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55 }}>
        This just dropped into your Resume Studio — ready to use in your next application.
      </p>

      {/* Resume bullet spotlight */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '0.8rem',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 8%, white), color-mix(in srgb, var(--color-accent) 4%, white))',
          border: '1.5px solid color-mix(in srgb, var(--color-accent) 22%, transparent)',
          marginBottom: '1.25rem',
          textAlign: 'left',
        }}
      >
        <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent)' }}>
          Your new resume bullet
        </p>
        <p style={{ margin: 0, fontSize: '0.95rem', fontStyle: 'italic', fontWeight: 500, lineHeight: 1.6, color: 'var(--color-on-surface)' }}>
          {result.resumeBullet}
        </p>
      </div>

      {result.skillsUnlocked.length > 0 && (
        <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
          <p style={{ margin: '0 0 0.45rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Skills added to your profile:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {result.skillsUnlocked.map((s) => (
              <SkillChip key={s} label={s} green />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="/dashboard/ai-tools/resume-studio"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.6rem 1.1rem',
            borderRadius: '0.5rem',
            border: '1.5px solid var(--color-accent)',
            color: 'var(--color-accent)',
            fontWeight: 700,
            fontSize: '0.88rem',
            textDecoration: 'none',
            background: 'none',
          }}
        >
          Open Resume Studio →
        </a>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onComplete}
          style={{ fontSize: '0.9rem' }}
        >
          Done ✓
        </button>
      </div>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function SkillMissionChallenge({ mission, onClose, onComplete }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswer[]>([]);
  const [evalResult, setEvalResult] = useState<(MissionEvalResponse & { ok: true }) | null>(null);

  const submitScenario = useCallback(
    async (scenarioResponse: string) => {
      const res = await fetch(
        `/api/skill-missions/${encodeURIComponent(mission.courseSlug)}/evaluate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            missionKey: mission.key,
            // Server re-grades from the catalog — only the selections go up.
            quizAnswers: quizAnswers.map(({ questionIndex, selectedIndex }) => ({
              questionIndex,
              selectedIndex,
            })),
            scenarioResponse,
          }),
        },
      );

      const data: MissionEvalResponse = await res.json();

      if (!data.ok) {
        throw new Error((data as { ok: false; error: string }).error || 'Evaluation failed');
      }

      setEvalResult(data as MissionEvalResponse & { ok: true });
      setPhase(3);
    },
    [mission, quizAnswers],
  );

  function handleQuizFinish(answers: QuizAnswer[]) {
    setQuizAnswers(answers);
    setPhase(2);
  }

  function handleResultContinue() {
    if (evalResult?.verdict === 'passed') {
      setPhase(4);
    }
  }

  function handleComplete() {
    if (evalResult) {
      onComplete(evalResult);
    }
  }

  // Prevent body scroll while modal is open
  // (CSS approach — no effect on SSR)
  const overlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={OVERLAY_STYLE} onClick={overlayClick} role="dialog" aria-modal="true" aria-label={mission.missionName}>
      {phase === 0 && (
        <PhaseIntro mission={mission} onAccept={() => setPhase(1)} onClose={onClose} />
      )}
      {phase === 1 && (
        <PhaseQuiz mission={mission} onFinish={handleQuizFinish} onClose={onClose} />
      )}
      {phase === 2 && (
        <PhaseScenario
          mission={mission}
          quizAnswers={quizAnswers}
          onSubmit={submitScenario}
          onBack={() => setPhase(1)}
          onClose={onClose}
        />
      )}
      {phase === 3 && evalResult && (
        <PhaseResult result={evalResult} onContinue={handleResultContinue} onClose={onClose} />
      )}
      {phase === 4 && evalResult && (
        <PhaseCelebration result={evalResult} onComplete={handleComplete} />
      )}
    </div>
  );
}
