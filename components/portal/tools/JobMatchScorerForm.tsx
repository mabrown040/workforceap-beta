'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton, ResumeTextInput } from './shared/AIToolShared';

export default function JobMatchScorerForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('job-match-scorer', 'Job Match Scorer');

    try {
      const res = await fetch('/api/ai/job-match-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
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
        expectation="Scores how closely your current resume aligns to one job posting and explains the strengths, gaps, and easiest improvements to make."
        inputs="A complete job description and the version of your resume you would submit right now."
        outputUse="Use the quick wins to adjust your resume or cover letter before you apply. A lower score does not mean do not apply; it means you should tailor more carefully."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <div className="form-group">
          <label htmlFor="job-desc">Job description</label>
          <textarea id="job-desc" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the full job posting here..." rows={8} required disabled={loading} />
        </div>
        <ResumeTextInput value={resume} onChange={setResume} disabled={loading} label="Resume to compare" rows={10} />
        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Get match score" loadingLabel="Analyzing fit…" />
        {output && <AIToolResult title="Match analysis" output={output} toolType="job_match_scorer" nextSteps={['cover-letter', 'interview-practice']} />}
      </form>
      <AIToolPathway currentTool="job-match-scorer" nextSteps={['cover-letter', 'interview-practice', 'application-tracker']} />
    </>
  );
}
