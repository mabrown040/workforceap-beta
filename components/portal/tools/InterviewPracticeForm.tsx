'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton } from './shared/AIToolShared';

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
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        body: JSON.stringify({ role, experienceLevel, count: 8 }),
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

  return (
    <>
      <AIToolIntro
        expectation="Generates role-specific practice questions with tips, STAR hints, and example answers so you can prepare with more structure."
        inputs="The title of the role you are interviewing for and the experience level that best matches you."
        outputUse="Do not memorize the sample answers. Use them to outline your own real stories and practice saying them out loud."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <div className="form-group">
          <label htmlFor="role">Target role</label>
          <input id="role" type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Data Analyst, Operations Coordinator" required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="experience">Experience level</label>
          <select id="experience" value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as 'entry' | 'mid' | 'senior')} disabled={loading}>
            <option value="entry">Entry-level (0–2 years)</option>
            <option value="mid">Mid-level (3–7 years)</option>
            <option value="senior">Senior (8+ years)</option>
          </select>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Generate questions" loadingLabel="Generating questions…" />
        {questions.length > 0 && <AIToolResult title="Interview practice set" output={JSON.stringify(questions)} toolType="interview_practice" nextSteps={['salary-negotiation']} />}
      </form>
      <AIToolPathway currentTool="interview-practice" nextSteps={['salary-negotiation']} />
    </>
  );
}
