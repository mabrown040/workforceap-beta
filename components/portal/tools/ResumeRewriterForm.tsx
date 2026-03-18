'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { trackToolLaunch } from '@/lib/analytics/events';

const SALARY_RANGES = [
  '',
  '$40,000 - $60,000',
  '$60,000 - $80,000',
  '$80,000 - $100,000',
  '$100,000 - $130,000',
  '$130,000+',
];

export default function ResumeRewriterForm() {
  const [resume, setResume] = useState('');
  const [jobTarget, setJobTarget] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        body: JSON.stringify({ resume, jobTarget, targetSalary: targetSalary || undefined, targetLocation: targetLocation.trim() || undefined }),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ai/extract-resume-text', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setResume(data.text);
      } else {
        setError(data.error ?? 'Could not extract text');
      }
    } catch {
      setError('Upload failed. Try pasting instead.');
    } finally {
      setExtracting(false);
      e.target.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="resume-rewriter-form">
      <div style={{ background: 'rgba(74,155,79,0.06)', border: '1px solid rgba(74,155,79,0.2)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-gray-700)', lineHeight: 1.5 }}>
          <strong>How this works:</strong> Tell us your career goal — we&rsquo;ll reposition your existing experience to match. We don&rsquo;t invent anything. Every bullet in the output comes from what you&rsquo;ve actually done.
        </p>
      </div>

      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.5rem' }}>
        <legend style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'block' }}>Your Career Goal</legend>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="job-target">Target job title *</label>
            <input
              id="job-target"
              type="text"
              value={jobTarget}
              onChange={(e) => setJobTarget(e.target.value)}
              placeholder="e.g. IT Support Specialist, Cybersecurity Analyst, Data Analyst"
              required
              disabled={loading}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="target-salary">Target salary range</label>
              <select
                id="target-salary"
                value={targetSalary}
                onChange={(e) => setTargetSalary(e.target.value)}
                disabled={loading}
              >
                {SALARY_RANGES.map((s) => (
                  <option key={s} value={s}>{s || 'Select a range (optional)'}</option>
                ))}
              </select>
              <small style={{ color: 'var(--color-gray-500)', fontSize: '0.8rem' }}>Helps calibrate language and seniority level</small>
            </div>
            <div className="form-group">
              <label htmlFor="target-location">Target city / location</label>
              <input
                id="target-location"
                type="text"
                value={targetLocation}
                onChange={(e) => setTargetLocation(e.target.value)}
                placeholder="e.g. Austin, TX"
                disabled={loading}
              />
              <small style={{ color: 'var(--color-gray-500)', fontSize: '0.8rem' }}>Tailors language to your local job market</small>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="form-group">
        <label htmlFor="resume">Your resume (paste or upload PDF/DOCX) *</label>
        <div className="resume-upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            disabled={extracting || loading}
            className="resume-file-input"
          />
          {extracting && <span className="resume-upload-status">Extracting text...</span>}
        </div>
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
        {loading ? 'Positioning your resume...' : 'Position my resume'}
      </button>

      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Your repositioned resume</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              Copy to clipboard
            </button>
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}