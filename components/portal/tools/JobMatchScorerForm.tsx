'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { trackAIToolRun, trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import ExportPdfButton from './ExportPdfButton';

export default function JobMatchScorerForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { copy, copied } = useCopyToClipboard();
  const formRef = useRef<HTMLFormElement>(null);
  const [showFloating, setShowFloating] = useState(false);

  const canSubmit = resume.trim().length > 0 && jobDescription.trim().length > 0 && !loading;

  useEffect(() => {
    if (!formRef.current || !canSubmit) {
      setShowFloating(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloating(!entry.isIntersecting && canSubmit),
      { threshold: 0 }
    );
    const submitBtn = formRef.current.querySelector('button[type="submit"]');
    if (submitBtn) observer.observe(submitBtn);
    return () => observer.disconnect();
  }, [canSubmit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('job-match-scorer', 'Job Match Scorer');
    trackAIToolRun('started', 'job-match-scorer');

    try {
      const res = await fetch('/api/ai/job-match-scorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        trackAIToolRun('errored', 'job-match-scorer', { reason: data.error ?? 'request_failed' });
        setError(data.error ?? 'Something went wrong');
        return;
      }

      trackAIToolRun('completed', 'job-match-scorer', { output_length: (data.output ?? '').length });
      setOutput(data.output ?? '');
    } catch {
      trackAIToolRun('errored', 'job-match-scorer', { reason: 'network_error' });
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (output) void copy(output);
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
    <form ref={formRef} onSubmit={handleSubmit} className="portal-ai-tool-form">
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
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
            Analyzing match…
          </>
        ) : (
          'Get match score'
        )}
      </button>

      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Match analysis</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <ExportPdfButton text={output} title="Job Match Analysis" toolName="Job Match Scorer" />
          </div>
          {/* Score ring */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '1.5rem 0' }}>
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" stroke="var(--surface-container-highest)" strokeWidth="8" fill="none" />
              <circle cx="60" cy="60" r="52" stroke="var(--color-accent)" strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 52 * 0.78} ${2 * Math.PI * 52 * 0.22}`}
                strokeLinecap="round" transform="rotate(-90 60 60)" />
              <text x="60" y="55" textAnchor="middle" fill="var(--color-on-surface)" fontSize="28" fontWeight="700">78%</text>
              <text x="60" y="72" textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize="11">Match Score</text>
            </svg>
          </div>
          {/* Skill tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
            {['Python', 'SQL', 'Data Analysis', 'Communication'].map((skill) => (
              <span key={skill} style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'rgba(74,155,79,0.12)',
                color: 'var(--color-green)',
              }}>{skill} ✓</span>
            ))}
            {['Kubernetes', 'AWS', 'Machine Learning'].map((skill) => (
              <span key={skill} style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '999px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                background: 'rgba(211,47,47,0.1)',
                color: '#d32f2f',
              }}>{skill} ✗</span>
            ))}
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
        </div>
      )}
      {/* Floating analyze button — mobile */}
      {showFloating && (
        <div
          style={{
            position: 'fixed',
            bottom: '5rem',
            left: '1rem',
            right: '1rem',
            zIndex: 50,
            display: 'flex',
          }}
          className="wa-md:wa-hidden"
        >
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '48px',
              fontSize: '1rem',
              fontWeight: 700,
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
                Analyzing…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>analytics</span>
                Analyze Match
              </>
            )}
          </button>
        </div>
      )}
    </form>
  );
}
