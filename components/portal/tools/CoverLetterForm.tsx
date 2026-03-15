'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';

export default function CoverLetterForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
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
        body: JSON.stringify({
          resume,
          jobDescription,
          companyName: companyName || 'the company',
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

  const handleCopy = () => {
    if (output) navigator.clipboard.writeText(output);
  };

  return (
    <form onSubmit={handleSubmit} className="resume-rewriter-form">
      <div className="form-group">
        <label htmlFor="company">Company name</label>
        <input
          id="company"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Acme Corp"
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="job-desc">Job description</label>
        <textarea
          id="job-desc"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job posting here..."
          rows={6}
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="resume">Your resume / experience</label>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume or key experience..."
          rows={8}
          required
          disabled={loading}
        />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Generating...' : 'Generate cover letter'}
      </button>
      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Cover letter</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              Copy to clipboard
            </button>
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
        </div>
      )}
    </form>
  );
}
