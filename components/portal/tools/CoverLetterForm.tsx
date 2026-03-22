'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton } from './shared/AIToolShared';

export default function CoverLetterForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tone, setTone] = useState<'formal' | 'confident' | 'conversational'>('formal');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('cover-letter', 'Cover Letter Builder');

    try {
      const res = await fetch('/api/ai/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription, companyName: companyName || 'the company', tone }),
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
        expectation="Builds a role-specific cover letter draft that connects your real experience to the posting in a tone you choose."
        inputs="The company name, the full job description, your resume or relevant experience, and the tone you want to strike."
        outputUse="Use the draft as a first version, then add your own voice, company-specific details, and any nuance the AI could not know."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <div className="ai-tool-grid ai-tool-grid-2">
          <div className="form-group">
            <label htmlFor="company">Company name</label>
            <input id="company" type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Corp" disabled={loading} />
          </div>
          <div className="form-group">
            <label htmlFor="tone">Tone</label>
            <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as 'formal' | 'confident' | 'conversational')} disabled={loading}>
              <option value="formal">Formal</option>
              <option value="confident">Confident</option>
              <option value="conversational">Conversational</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="job-desc">Job description</label>
          <textarea id="job-desc" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job posting here..." rows={7} required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="resume">Resume / relevant experience</label>
          <textarea id="resume" value={resume} onChange={(e) => setResume(e.target.value)} placeholder="Paste your resume or the experience you want reflected..." rows={10} required disabled={loading} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Generate cover letter" loadingLabel="Generating cover letter…" />
        {output && <AIToolResult title="Cover letter draft" output={output} toolType="cover_letter" nextSteps={['application-tracker', 'interview-practice']} />}
      </form>
      <AIToolPathway currentTool="cover-letter" nextSteps={['application-tracker', 'interview-practice']} />
    </>
  );
}
