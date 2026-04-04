'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

type Question = {
  question: string;
  type: string;
  tip: string;
  starHint?: string;
  exampleAnswer?: string;
};

export default function InterviewPracticeForm() {
  const [role, setRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior'>('mid');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { copy, copied } = useCopyToClipboard();

  const FOCUS_OPTIONS = [
    { id: 'behavioral', icon: 'psychology', label: 'Behavioral' },
    { id: 'technical', icon: 'code', label: 'Technical' },
    { id: 'situational', icon: 'lightbulb', label: 'Situational' },
    { id: 'leadership', icon: 'groups', label: 'Leadership' },
    { id: 'problem-solving', icon: 'extension', label: 'Problem Solving' },
    { id: 'culture-fit', icon: 'favorite', label: 'Culture Fit' },
  ];

  const toggleFocus = (id: string) =>
    setFocusAreas((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setQuestions([]);
    setLoading(true);
    trackToolLaunch('interview-practice', 'Interview Practice Generator');

    try {
      const res = await fetch('/api/ai/interview-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, experienceLevel, focusAreas: focusAreas.length ? focusAreas : undefined, difficulty, count: 8 }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }

      setQuestions(data.questions ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const text = questions
      .map(
        (q) =>
          `${q.question}\nType: ${q.type}\nTip: ${q.tip}${q.starHint ? `\nSTAR hint: ${q.starHint}` : ''}${q.exampleAnswer ? `\nExample answer: ${q.exampleAnswer}` : ''}\n`
      )
      .join('\n');
    void copy(text);
  };

  return (
    <form onSubmit={handleSubmit} className="interview-practice-form">
      <div className="form-group">
        <label htmlFor="role">Target role</label>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Software Developer, Data Analyst"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="experience">Experience level</label>
        <select
          id="experience"
          value={experienceLevel}
          onChange={(e) => setExperienceLevel(e.target.value as 'entry' | 'mid' | 'senior')}
          disabled={loading}
        >
          <option value="entry">Entry-level (0-2 years)</option>
          <option value="mid">Mid-level (3-7 years)</option>
          <option value="senior">Senior (8+ years)</option>
        </select>
      </div>
      {/* Focus area cards */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Focus areas <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>(optional)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
          {FOCUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleFocus(opt.id)}
              disabled={loading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.75rem 0.5rem',
                borderRadius: '0.75rem',
                border: focusAreas.includes(opt.id) ? '2px solid var(--color-accent)' : '1px solid var(--outline-variant, rgba(0,0,0,0.08))',
                background: focusAreas.includes(opt.id) ? 'rgba(173,44,77,0.06)' : 'var(--surface-container)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: focusAreas.includes(opt.id) ? 'var(--color-accent)' : 'var(--color-on-surface)',
                minHeight: '44px',
                transition: 'all 0.15s ease',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty slider */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label htmlFor="difficulty" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.375rem', fontSize: '0.9375rem' }}>
          <span>Difficulty</span>
          <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)', fontSize: '0.8125rem' }}>
            {difficulty <= 3 ? 'Easy' : difficulty <= 6 ? 'Medium' : difficulty <= 8 ? 'Hard' : 'Expert'}
          </span>
        </label>
        <input
          id="difficulty"
          type="range"
          min={1}
          max={10}
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
          disabled={loading}
          style={{ width: '100%', accentColor: 'var(--color-accent)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
          <span>Warm-up</span>
          <span>Expert</span>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
            Generating questions…
          </>
        ) : (
          'Generate questions'
        )}
      </button>

      {questions.length > 0 && (
        <div className="interview-practice-output">
          <div className="interview-practice-output-header">
            <h3>Interview questions</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy all'}
            </button>
          </div>
          <ol className="interview-practice-list">
            {questions.map((q, i) => (
              <li key={i} className="interview-practice-item">
                <div className="interview-practice-question">{q.question}</div>
                <span className={`interview-practice-type type-${q.type}`}>{q.type}</span>
                <p className="interview-practice-tip">{q.tip}</p>
                {q.starHint && (
                  <p className="interview-practice-star">STAR hint: {q.starHint}</p>
                )}
                {q.exampleAnswer && (
                  <div className="interview-practice-example">
                    <strong>Example answer:</strong> {q.exampleAnswer}
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}
