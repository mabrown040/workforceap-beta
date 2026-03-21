'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trackToolLaunch } from '@/lib/analytics/events';

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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <form onSubmit={handleSubmit} className="resume-rewriter-form">
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
      {error && <div className="form-error" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Generating...' : 'Generate headlines'}
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
                  onClick={() => handleCopy(h)}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}
