'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { trackToolLaunch } from '@/lib/analytics/events';

export default function JobMatchScorerForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
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
      <div className="form-group">
        <label htmlFor="job-desc">Job description</label>
        <textarea
          id="job-desc"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job posting here..."
          rows={6}
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="resume">Your resume (paste or upload PDF/DOCX)</label>
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
          rows={10}
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
        {loading ? 'Analyzing match...' : 'Get match score'}
      </button>

      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Match analysis</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              Copy to clipboard
            </button>
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
    </form>
  );
}
