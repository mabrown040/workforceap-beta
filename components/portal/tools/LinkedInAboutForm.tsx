'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton } from './shared/AIToolShared';

export default function LinkedInAboutForm() {
  const [role, setRole] = useState('');
  const [bullets, setBullets] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('linkedin-about', 'LinkedIn About Section Generator');

    try {
      const res = await fetch('/api/ai/linkedin-about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, bullets }),
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
        expectation="Creates a more polished LinkedIn About section from a few bullet points, with enough structure to help you start but still leave room for your voice."
        inputs="Your target role plus 3–5 bullets covering your experience, strengths, or what you want employers to notice."
        outputUse="Edit for authenticity before posting. The best About section still sounds like you and includes details the AI could not know."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <div className="form-group">
          <label htmlFor="role">Target role / job title</label>
          <input id="role" type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Project Manager, Operations Analyst" required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="bullets">Bullet points about you</label>
          <textarea id="bullets" value={bullets} onChange={(e) => setBullets(e.target.value)} placeholder={'• Led onboarding for new staff\n• Coordinated cross-team projects\n• Strong in stakeholder communication'} rows={8} required disabled={loading} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Generate About section" loadingLabel="Generating About section…" />
        {output && <AIToolResult title="LinkedIn About draft" output={output} toolType="linkedin_about" nextSteps={['application-tracker']} />}
      </form>
      <AIToolPathway currentTool="linkedin-about" nextSteps={['application-tracker']} />
    </>
  );
}
