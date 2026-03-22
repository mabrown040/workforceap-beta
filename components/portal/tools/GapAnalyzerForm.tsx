'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton, ResumeTextInput } from './shared/AIToolShared';

export default function GapAnalyzerForm() {
  const [resume, setResume] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('gap-analyzer', 'Resume Gap Analyzer');

    try {
      const res = await fetch('/api/ai/gap-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setOutput(data.output ?? '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AIToolIntro
        expectation="Reviews your resume for employment gaps and gives professional language you can use to explain them clearly."
        inputs="The resume you plan to use for applications or interviews."
        outputUse="Borrow the suggested framing for cover letters, applications, and interview stories. Rewrite it in your own words before using it live."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <ResumeTextInput value={resume} onChange={setResume} disabled={loading} label="Resume to analyze" />
        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Analyze gaps" loadingLabel="Analyzing gaps…" />
        {output && <AIToolResult title="Gap analysis" output={output} toolType="gap_analyzer" nextSteps={['job-match-scorer', 'interview-practice']} />}
      </form>
      <AIToolPathway currentTool="gap-analyzer" nextSteps={['job-match-scorer', 'interview-practice']} />
    </>
  );
}
