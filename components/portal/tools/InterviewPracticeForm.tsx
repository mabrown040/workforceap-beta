'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRetryableFetch } from '@/hooks/useRetryableFetch';
import AiToolError from './AiToolError';
import ToolFollowThrough from './ToolFollowThrough';
import { Loader2 } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';
import ExportPdfButton from './ExportPdfButton';
import AiToolLanguageSelector, { type AiToolLanguage } from './AiToolLanguageSelector';

type Question = {
  question: string;
  type: string;
  tip: string;
  starHint?: string;
  exampleAnswer?: string;
};

type StarWorksheet = { situation: string; task: string; action: string; result: string };

const emptyStar = (): StarWorksheet => ({ situation: '', task: '', action: '', result: '' });

export default function InterviewPracticeForm({ memberId, initialData }: { memberId?: string; initialData?: { role: string; experienceLevel: 'entry' | 'mid' | 'senior'; resumeContext: string } | null }) {
  const [role, setRole] = useState(initialData?.role ?? '');
  const [resumeContext, setResumeContext] = useState(initialData?.resumeContext ?? '');
  const [experienceLevel, setExperienceLevel] = useState<'entry' | 'mid' | 'senior'>(initialData?.experienceLevel ?? 'mid');
  const [language, setLanguage] = useState<AiToolLanguage>('en');
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [starByIndex, setStarByIndex] = useState<Record<number, StarWorksheet>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { copy, copied } = useCopyToClipboard();
  const { execute, clearRetry, retryState } = useRetryableFetch();

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

  useHydrateMemberResumePlainText(setResumeContext, memberId);

  const doSubmit = async () => {
    setError('');
    setQuestions([]);
    setStarByIndex({});
    setLoading(true);
    trackToolLaunch('interview-practice', 'Interview Practice Generator');

    await execute(
      async () => {
        const res = await fetch('/api/ai/interview-practice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role,
            experienceLevel,
            focusAreas: focusAreas.length ? focusAreas : undefined,
            difficulty,
            count: 8,
            resumeContext: resumeContext.trim() || undefined,
            language,
            ...(memberId ? { subjectMemberId: memberId } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
        return data;
      },
      (data) => setQuestions(data.questions ?? []),
      (err) => setError(err),
    );

    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearRetry();
    void doSubmit();
  };

  const buildSessionTranscript = () => {
    const header = [
      'WorkforceAP — Interview practice session',
      `Target role: ${role || '(not set)'}`,
      `Experience: ${experienceLevel}`,
      `Focus: ${focusAreas.length ? focusAreas.join(', ') : 'any'}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '---',
      '',
    ].join('\n');

    const body = questions
      .map((q, i) => {
        const star = starByIndex[i] ?? emptyStar();
        const starBlock = [star.situation, star.task, star.action, star.result].some((s) => s.trim())
          ? [
              'STAR worksheet (your notes):',
              star.situation.trim() ? `  Situation: ${star.situation.trim()}` : '  Situation: —',
              star.task.trim() ? `  Task: ${star.task.trim()}` : '  Task: —',
              star.action.trim() ? `  Action: ${star.action.trim()}` : '  Action: —',
              star.result.trim() ? `  Result: ${star.result.trim()}` : '  Result: —',
            ].join('\n')
          : 'STAR worksheet: (not filled yet)';
        return [
          `Question ${i + 1}`,
          q.question,
          `Type: ${q.type}`,
          `Tip: ${q.tip}`,
          q.starHint ? `STAR hint: ${q.starHint}` : '',
          q.exampleAnswer ? `Example answer: ${q.exampleAnswer}` : '',
          starBlock,
          '',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    return `${header}${body}`;
  };

  const handleCopy = () => {
    void copy(buildSessionTranscript());
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([buildSessionTranscript()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-practice-${(role || 'session').replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 40) || 'session'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateStar = (index: number, field: keyof StarWorksheet, value: string) => {
    setStarByIndex((prev) => ({
      ...prev,
      [index]: { ...(prev[index] ?? emptyStar()), [field]: value },
    }));
  };

  const pdfExportText = buildSessionTranscript();

  return (
    <form onSubmit={handleSubmit} className="interview-practice-form">
      <AiToolLanguageSelector value={language} onChange={setLanguage} />
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
        <label htmlFor="interview-resume-context">Resume context (optional)</label>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', margin: '0 0 0.5rem' }}>
          Pre-filled from your uploaded resume when available. We use this to tailor questions — not shown to employers.
        </p>
        <textarea
          id="interview-resume-context"
          value={resumeContext}
          onChange={(e) => setResumeContext(e.target.value)}
          placeholder="Paste key bullets or your full resume so practice questions match your background."
          rows={5}
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
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }} aria-hidden="true">{opt.icon}</span>
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
        <div style={{ marginBottom: '1rem' }}>
          <AiToolError
            error={error}
            onRetry={retryState.isRetrying ? undefined : doSubmit}
            isRetrying={retryState.isRetrying}
            nextRetryIn={retryState.nextRetryIn}
            retryCount={retryState.retryCount}
          />
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={18} />
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
              <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy transcript'}
              </span>
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadTxt}>
              Download .txt
            </button>
            <ExportPdfButton
              text={pdfExportText}
              title="Interview Practice Session"
              toolName="Interview Practice"
            />
          </div>
          <p className="interview-practice-star-intro" style={{ fontSize: '0.85rem', color: 'var(--color-on-surface-variant)', margin: '0 0 1rem' }}>
            Use the STAR worksheet under each question to draft your answer (Situation → Task → Action → Result). It’s included in copy, PDF, and .txt export.
          </p>
          <ol className="interview-practice-list">
            {questions.map((q, i) => {
              const star = starByIndex[i] ?? emptyStar();
              return (
                <li key={i} className="interview-practice-item">
                  <div className="interview-practice-question">{q.question}</div>
                  <span className={`interview-practice-type type-${q.type}`}>{q.type}</span>
                  <p className="interview-practice-tip">{q.tip}</p>
                  {q.starHint && (
                    <p className="interview-practice-star">STAR hint: {q.starHint}</p>
                  )}
                  <details className="interview-practice-star-details" style={{ marginTop: '0.75rem' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-accent)' }}>
                      STAR answer worksheet
                    </summary>
                    <div style={{ display: 'grid', gap: '0.65rem', marginTop: '0.75rem', paddingLeft: '0.25rem' }}>
                      {(
                        [
                          ['situation', 'Situation — context and stakes'] as const,
                          ['task', 'Task — what you needed to achieve'] as const,
                          ['action', 'Action — what you did'] as const,
                          ['result', 'Result — outcome and metrics'] as const,
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="form-group" style={{ marginBottom: 0 }}>
                          <label htmlFor={`star-${i}-${key}`} style={{ fontSize: '0.8rem' }}>
                            {label}
                          </label>
                          <textarea
                            id={`star-${i}-${key}`}
                            value={star[key]}
                            onChange={(e) => updateStar(i, key, e.target.value)}
                            rows={key === 'action' ? 3 : 2}
                            placeholder={`Draft your ${key}…`}
                            disabled={loading}
                            style={{ fontSize: '0.875rem' }}
                          />
                        </div>
                      ))}
                    </div>
                  </details>
                  {q.exampleAnswer && (
                    <div className="interview-practice-example">
                      <strong>Example answer:</strong> {q.exampleAnswer}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <ToolFollowThrough toolType="interview_practice" />
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}
