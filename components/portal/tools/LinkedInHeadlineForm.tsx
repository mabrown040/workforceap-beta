'use client';

import { useState } from 'react';
import Link from 'next/link';
import { } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import ToolFollowThrough from './ToolFollowThrough';
import AiToolError from './AiToolError';

export default function LinkedInHeadlineForm() {
  const [role, setRole] = useState('');
  const [keySkills, setKeySkills] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useDraftAutosave('ai-tool:linkedin-headline:role', role, setRole);
  useDraftAutosave('ai-tool:linkedin-headline:keySkills', keySkills, setKeySkills);
  useDraftAutosave('ai-tool:linkedin-headline:yearsExperience', yearsExperience, setYearsExperience);

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
        body: JSON.stringify({ role, keySkills, yearsExperience: yearsExperience || undefined })});

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

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      window.setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <form onSubmit={handleSubmit} className="portal-ai-tool-form">
      <div className="form-group">
        <label htmlFor="role">Target role</label>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Software Developer"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="skills">Key skills (comma-separated)</label>
        <input
          id="skills"
          type="text"
          value={keySkills}
          onChange={(e) => setKeySkills(e.target.value)}
          placeholder="e.g. Python, AWS, Data Analysis"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="experience">Years of experience (optional)</label>
        <input
          id="experience"
          type="text"
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          placeholder="e.g. 5+ years"
          disabled={loading}
        />
      </div>
      {error ? <AiToolError error={error} /> : null}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={18} />
            Generating headlines…
          </>
        ) : (
          'Generate headlines'
        )}
      </button>
      {headlines.length > 0 && (
        <div className="resume-rewriter-output">
          <h3>Headline options</h3>
          <ul className="headline-list">
            {headlines.map((h, i) => (
              <li key={i} className="headline-item">
                <span>{h}</span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => void handleCopy(h, i)}
                >
                  <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    {copiedIdx === i ? (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px' }} aria-hidden="true">check</span>
                        Copied!
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginRight: '4px' }} aria-hidden="true">content_copy</span>
                        Copy
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
          <ToolFollowThrough toolType="linkedin_headline" />
        </div>
      )}
    </form>
  );
}
