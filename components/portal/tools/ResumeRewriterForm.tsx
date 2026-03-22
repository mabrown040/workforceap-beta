'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton, ResumeTextInput } from './shared/AIToolShared';

const SALARY_RANGES = ['', '$40,000 - $60,000', '$60,000 - $80,000', '$80,000 - $100,000', '$100,000 - $130,000', '$130,000+'];

export default function ResumeRewriterForm() {
  const [resume, setResume] = useState('');
  const [jobTarget, setJobTarget] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('resume-rewriter', 'Resume Rewriter');

    try {
      const res = await fetch('/api/ai/resume-rewriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume,
          jobTarget,
          targetSalary: targetSalary || undefined,
          targetLocation: targetLocation.trim() || undefined,
        }),
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
        expectation="Rewrites your existing resume toward a target role using stronger framing, clearer language, and more relevant emphasis without inventing experience."
        inputs="A current resume, the role you want, and optional salary/location context if you want the tone adjusted for a specific market or level."
        outputUse="Treat the result as a working draft. Review every bullet, keep only what is true, and use that draft for job match scoring and role-specific tailoring."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <fieldset className="ai-tool-fieldset">
          <legend>Your goal</legend>
          <div className="ai-tool-grid ai-tool-grid-2">
            <div className="form-group">
              <label htmlFor="job-target">Target job title</label>
              <input id="job-target" type="text" value={jobTarget} onChange={(e) => setJobTarget(e.target.value)} placeholder="e.g. IT Support Specialist, Cybersecurity Analyst" required disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="target-location">Target city / location</label>
              <input id="target-location" type="text" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="e.g. Austin, TX" disabled={loading} />
            </div>
            <div className="form-group">
              <label htmlFor="target-salary">Target salary range</label>
              <select id="target-salary" value={targetSalary} onChange={(e) => setTargetSalary(e.target.value)} disabled={loading}>
                {SALARY_RANGES.map((salary) => <option key={salary} value={salary}>{salary || 'Select a range (optional)'}</option>)}
              </select>
              <small>Used to calibrate tone and seniority, not to invent qualifications.</small>
            </div>
          </div>
        </fieldset>

        <ResumeTextInput value={resume} onChange={setResume} disabled={loading} label="Current resume" placeholder="Paste your current resume here..." />

        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Position my resume" loadingLabel="Positioning your resume…" />

        {output && <AIToolResult title="Your repositioned resume" output={output} toolType="resume_rewriter" nextSteps={['job-match-scorer', 'cover-letter']} />}
      </form>
      <AIToolPathway currentTool="resume-rewriter" nextSteps={['job-match-scorer', 'cover-letter', 'interview-practice']} />
    </>
  );
}
