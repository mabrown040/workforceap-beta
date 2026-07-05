'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import ExportPdfButton from './ExportPdfButton';
import AiToolLanguageSelector, { type AiToolLanguage } from './AiToolLanguageSelector';
import { useRetryableFetch } from '@/hooks/useRetryableFetch';
import AiToolError from './AiToolError';
import ToolFollowThrough from './ToolFollowThrough';

const SALARY_RANGES = [
  '',
  'Under $40,000',
  '$40,000 - $60,000',
  '$60,000 - $80,000',
  '$80,000 - $100,000',
  '$100,000 - $130,000',
  '$130,000+',
];

type ResumeRewriterFormProps = {
  initialResume?: string;
  /** When set with onResumeChange, the resume field is controlled (e.g. profile coach Accept → append). */
  resumeControlled?: string;
  onResumeChange?: (value: string) => void;
  resumeBanner?: ReactNode;
};

export default function ResumeRewriterForm({
  initialResume,
  resumeControlled,
  onResumeChange,
  resumeBanner}: ResumeRewriterFormProps = {}) {
  const [internalResume, setInternalResume] = useState(initialResume ?? '');
  const isControlled = onResumeChange != null;
  const resume = isControlled ? (resumeControlled ?? '') : internalResume;

  const setResume = (value: string) => {
    if (isControlled) onResumeChange(value);
    else setInternalResume(value);
  };

  const onResumeChangeRef = useRef(onResumeChange);
  const resumeControlledRef = useRef(resumeControlled);
  onResumeChangeRef.current = onResumeChange;
  resumeControlledRef.current = resumeControlled;

  useEffect(() => {
    if (isControlled) return;
    let cancelled = false;
    fetch('/api/member/resume?includePlainText=1')
      .then((r) => r.json())
      .then((d: { resumePlainText?: string | null }) => {
        if (cancelled) return;
        const t = d.resumePlainText?.trim();
        if (!t) return;
        setInternalResume((prev) => (prev.trim() ? prev : t));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isControlled]);

  const [jobTarget, setJobTarget] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [targetLocation, setTargetLocation] = useState('');
  const [language, setLanguage] = useState<AiToolLanguage>('en');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [tone, setTone] = useState<'professional' | 'conversational' | 'executive'>('professional');
  const [atsOptimize, setAtsOptimize] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { copy, copied } = useCopyToClipboard();
  const { execute, clearRetry, retryState } = useRetryableFetch();

  const doSubmit = async () => {
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('resume-rewriter', 'Resume Rewriter');

    await execute(
      async () => {
        const res = await fetch('/api/ai/resume-rewriter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume,
            jobTarget,
            targetSalary: targetSalary || undefined,
            targetLocation: targetLocation.trim() || undefined,
            tone,
            atsOptimize,
            language})});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
        return data;
      },
      (data) => setOutput(data.output ?? ''),
      (err) => setError(err),
    );

    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearRetry();
    void doSubmit();
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
        body: formData});
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
    <form onSubmit={handleSubmit} className="portal-ai-tool-form">
      <AiToolLanguageSelector value={language} onChange={setLanguage} />
      <div style={{ background: 'rgba(74,155,79,0.06)', border: '1px solid rgba(74,155,79,0.2)', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
          <strong>How this works:</strong> Tell us your career goal — we&rsquo;ll reposition your existing experience to match. We don&rsquo;t invent anything. Every bullet in the output comes from what you&rsquo;ve actually done.
        </p>
      </div>

      {/* Controls bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.875rem 1rem', background: 'var(--surface-container)', borderRadius: '0.75rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 auto' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-on-surface-variant)' }} aria-hidden="true">tune</span>
          <label htmlFor="tone-select" style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Tone</label>
          <select
            id="tone-select"
            value={tone}
            onChange={(e) => setTone(e.target.value as typeof tone)}
            disabled={loading}
            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.625rem', borderRadius: '0.375rem', border: '1px solid var(--outline-variant)', background: 'var(--color-white, #fff)', color: 'var(--color-on-surface)', minHeight: '36px' }}
          >
            <option value="professional">Professional</option>
            <option value="conversational">Conversational</option>
            <option value="executive">Executive</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={atsOptimize}
            onChange={(e) => setAtsOptimize(e.target.checked)}
            disabled={loading}
            style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)' }}
          />
          <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: atsOptimize ? 'var(--color-green)' : 'var(--color-on-surface-variant)' }} aria-hidden="true">verified</span>
          ATS Optimized
        </label>
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
              <small style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem' }}>Helps calibrate language and seniority level</small>
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
              <small style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.8rem' }}>Tailors language to your local job market</small>
            </div>
          </div>
        </div>
      </fieldset>

      <div className="form-group">
        <label htmlFor="resume">Your resume (paste or upload PDF/DOCX) *</label>
        {resumeBanner}
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
        <div style={{ marginBottom: '1rem' }}>
          <AiToolError
            error={error}
            onRetry={retryState.isRetrying ? undefined : doSubmit}
            isRetrying={retryState.isRetrying}
            nextRetryIn={retryState.nextRetryIn}
            retryCount={retryState.retryCount}
          />
        </div>
      )}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={18} />
            Positioning your resume…
          </>
        ) : (
          'Position my resume'
        )}
      </button>

      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Your repositioned resume</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </span>
            </button>
            <ExportPdfButton text={output} title="Resume" toolName="Resume Rewriter" />
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
          <ToolFollowThrough toolType="resume_rewriter" output={output} />
        </div>
      )}
      {/* Knowledge card */}
      <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'var(--surface-container-low)', borderRadius: '0.75rem', border: '1px solid var(--outline-variant, rgba(0,0,0,0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-gold)' }} aria-hidden="true">lightbulb</span>
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Resume tips</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.7 }}>
          <li>Use quantifiable achievements (&ldquo;Reduced ticket response time by 40%&rdquo;)</li>
          <li>Mirror keywords from the job posting for ATS compatibility</li>
          <li>Keep to 1 page for &lt;10 years experience, 2 pages max</li>
          <li>Lead each bullet with a strong action verb</li>
        </ul>
      </div>
    </form>
  );
}
