'use client';

import { FormEvent, useMemo, useState } from 'react';

type InterviewType = 'technical' | 'behavioral' | 'general';

interface SessionResponse {
  sessionId: string;
  firstQuestion: string;
}

export default function InterviewCoach() {
  const [role, setRole] = useState('');
  const [interviewType, setInterviewType] = useState<InterviewType>('technical');
  const [sessionId, setSessionId] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canStart = role.trim().length > 1 && !loading;
  const currentQuestion = questions[answers.length] ?? '';
  const interviewComplete = answers.length >= 5;
  const canSubmitAnswer = currentAnswer.trim().length > 0 && !loading && !interviewComplete;

  const progressLabel = useMemo(() => {
    if (questions.length === 0) return 'Not started';
    return `Question ${Math.min(answers.length + 1, 5)} of 5`;
  }, [answers.length, questions.length]);

  async function startInterview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStart) return;

    setLoading(true);
    setError('');
    setFeedback('');
    setQuestions([]);
    setAnswers([]);
    setCurrentAnswer('');

    try {
      const response = await fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: role.trim(), interviewType }),
      });
      const data = (await response.json()) as Partial<SessionResponse> & { error?: string };
      if (!response.ok || !data.firstQuestion || !data.sessionId) {
        throw new Error(data.error ?? 'Unable to start interview.');
      }

      setSessionId(data.sessionId);
      setQuestions([data.firstQuestion]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitAnswer) return;

    const nextAnswers = [...answers, currentAnswer.trim()];
    setAnswers(nextAnswers);
    setCurrentAnswer('');

    if (nextAnswers.length >= 5) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/interview/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: role.trim(),
          interviewType,
          answers: nextAnswers,
          sessionId,
        }),
      });
      const data = (await response.json()) as Partial<SessionResponse> & { error?: string };
      if (!response.ok || !data.firstQuestion) {
        throw new Error(data.error ?? 'Unable to generate next question.');
      }

      const nextQuestion = data.firstQuestion;
      setQuestions((prev) => [...prev, nextQuestion]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function getFeedback() {
    if (!sessionId || answers.length < 5 || loading) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/interview/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers,
          role: role.trim(),
          interviewType,
          questions,
        }),
      });
      const data = (await response.json()) as { feedback?: string; error?: string };
      if (!response.ok || !data.feedback) {
        throw new Error(data.error ?? 'Unable to generate feedback.');
      }

      setFeedback(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stitch-card" style={{ padding: '1rem', borderRadius: 16 }}>
      <form onSubmit={startInterview} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Job role</span>
          <input
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Frontend Developer"
            style={{
              border: '1px solid var(--surface-container-highest)',
              borderRadius: 10,
              padding: '0.65rem 0.8rem',
              background: 'var(--surface-container-low)',
              color: 'var(--color-on-surface)',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Interview type</span>
          <select
            value={interviewType}
            onChange={(event) => setInterviewType(event.target.value as InterviewType)}
            style={{
              border: '1px solid var(--surface-container-highest)',
              borderRadius: 10,
              padding: '0.65rem 0.8rem',
              background: 'var(--surface-container-low)',
              color: 'var(--color-on-surface)',
            }}
          >
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="general">General</option>
          </select>
        </label>

        <button
          type="submit"
          disabled={!canStart}
          style={{
            border: 'none',
            borderRadius: 10,
            padding: '0.7rem 0.85rem',
            fontWeight: 700,
            background: 'var(--color-accent)',
            color: '#fff',
            cursor: canStart ? 'pointer' : 'not-allowed',
            opacity: canStart ? 1 : 0.6,
          }}
        >
          {loading && questions.length === 0 ? 'Starting…' : 'Start Interview'}
        </button>
      </form>

      {questions.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)' }}>{progressLabel}</div>

          {answers.map((answer, index) => (
            <div key={`qa-${index}`} style={{ background: 'var(--surface-container-low)', borderRadius: 12, padding: '0.75rem' }}>
              <p style={{ margin: '0 0 0.35rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                Q{index + 1}: {questions[index]}
              </p>
              <p style={{ margin: 0, color: 'var(--color-on-surface-variant)' }}>A{index + 1}: {answer}</p>
            </div>
          ))}

          {!interviewComplete && currentQuestion && (
            <form onSubmit={submitAnswer} style={{ display: 'grid', gap: '0.5rem' }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-on-surface)' }}>
                Q{answers.length + 1}: {currentQuestion}
              </p>
              <textarea
                value={currentAnswer}
                onChange={(event) => setCurrentAnswer(event.target.value)}
                rows={4}
                placeholder="Type your answer..."
                style={{
                  border: '1px solid var(--surface-container-highest)',
                  borderRadius: 10,
                  padding: '0.65rem 0.8rem',
                  background: 'var(--surface-container-low)',
                  color: 'var(--color-on-surface)',
                  resize: 'vertical',
                }}
              />
              <button
                type="submit"
                disabled={!canSubmitAnswer}
                style={{
                  border: 'none',
                  borderRadius: 10,
                  padding: '0.65rem 0.85rem',
                  fontWeight: 700,
                  background: 'var(--color-blue)',
                  color: '#fff',
                  cursor: canSubmitAnswer ? 'pointer' : 'not-allowed',
                  opacity: canSubmitAnswer ? 1 : 0.6,
                }}
              >
                {loading ? 'Generating next question…' : 'Submit Answer'}
              </button>
            </form>
          )}

          {interviewComplete && (
            <button
              type="button"
              onClick={getFeedback}
              disabled={loading || Boolean(feedback)}
              style={{
                border: 'none',
                borderRadius: 10,
                padding: '0.7rem 0.85rem',
                fontWeight: 700,
                background: 'var(--color-green)',
                color: '#fff',
                cursor: loading || Boolean(feedback) ? 'not-allowed' : 'pointer',
                opacity: loading || Boolean(feedback) ? 0.6 : 1,
              }}
            >
              {loading ? 'Generating feedback…' : 'Get Feedback'}
            </button>
          )}
        </div>
      )}

      {feedback && (
        <div style={{ marginTop: '1rem', background: 'var(--surface-container)', borderRadius: 12, padding: '0.85rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Feedback Summary</h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--color-on-surface-variant)' }}>{feedback}</p>
        </div>
      )}

      {error && <p style={{ marginTop: '0.75rem', color: 'var(--color-accent)', fontSize: '0.875rem' }}>{error}</p>}
    </div>
  );
}
