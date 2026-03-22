'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { AIToolIntro, AIToolPathway, AIToolResult, AIToolSubmitButton } from './shared/AIToolShared';

export default function LinkedInHeadlineForm() {
  const [role, setRole] = useState('');
  const [keySkills, setKeySkills] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setHeadlines([]);
    setLoading(true);
    trackToolLaunch('linkedin-headline', 'LinkedIn Headline Generator');

    try {
      const res = await fetch('/api/ai/linkedin-headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, keySkills, yearsExperience: yearsExperience || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        return;
      }
      setHeadlines(data.headlines ?? []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AIToolIntro
        expectation="Generates several concise headline options so your LinkedIn profile quickly signals the role you want and the value you bring."
        inputs="Your target role, a few key skills, and optional experience level context."
        outputUse="Pick the option that sounds most like you, then edit for specificity so it matches your resume and target roles."
      />
      <form onSubmit={handleSubmit} className="portal-ai-tool-form">
        <div className="form-group">
          <label htmlFor="role">Target role</label>
          <input id="role" type="text" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Developer" required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="skills">Key skills</label>
          <input id="skills" type="text" value={keySkills} onChange={(e) => setKeySkills(e.target.value)} placeholder="e.g. Python, AWS, customer support, analytics" required disabled={loading} />
        </div>
        <div className="form-group">
          <label htmlFor="experience">Years of experience</label>
          <input id="experience" type="text" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} placeholder="Optional" disabled={loading} />
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <AIToolSubmitButton loading={loading} idleLabel="Generate headlines" loadingLabel="Generating headlines…" />
        {headlines.length > 0 && <AIToolResult title="Headline options" output={JSON.stringify(headlines)} toolType="linkedin_headline" nextSteps={['linkedin-about', 'application-tracker']} />}
      </form>
      <AIToolPathway currentTool="linkedin-headline" nextSteps={['linkedin-about', 'application-tracker']} />
    </>
  );
}
