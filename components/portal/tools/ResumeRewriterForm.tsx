'use client';

import { useState } from 'react';
import { trackToolLaunch } from '@/lib/analytics/events';

export default function ResumeRewriterForm() {
  const [resume, setResume] = useState('');
  const [jobTarget, setJobTarget] = useState('');
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
        body: JSON.stringify({ resume, jobTarget }),
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
    if (output) {
      navigator.clipboard.writeText(output);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="resume-rewriter-form">
      <div className="form-group">
        <label htmlFor="job-target">Target job or role</label>
        <input
          id="job-target"
          type="text"
          value={jobTarget}
          onChange={(e) => setJobTarget(e.target.value)}
          placeholder="e.g. Software Developer at Tech Company"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="resume">Your resume (paste full text)</label>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume here..."
          rows={12}
          required
          disabled={loading}
        />
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Improving your resume...' : 'Improve resume'}
      </button>

      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Improved resume</h3>
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
