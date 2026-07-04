'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';
import ExportPdfButton from './ExportPdfButton';
import ToolFollowThrough from './ToolFollowThrough';

export default function CoverLetterForm() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tone, setTone] = useState<'formal' | 'confident' | 'conversational'>('formal');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { copy, copied } = useCopyToClipboard();

  useHydrateMemberResumePlainText(setResume);
  // Resume hydrates server-side. Persist only user-typed fields so a refresh
  // doesn't lose work mid-paste of a long job description.
  useDraftAutosave('ai-tool:cover-letter:jobDescription', jobDescription, setJobDescription);
  useDraftAutosave('ai-tool:cover-letter:companyName', companyName, setCompanyName);

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
          tone,
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
    if (output) void copy(output);
  };

  return (
    <form onSubmit={handleSubmit} className="portal-ai-tool-form">
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
        <label htmlFor="tone">Tone</label>
        <select
          id="tone"
          value={tone}
          onChange={(e) => setTone(e.target.value as 'formal' | 'confident' | 'conversational')}
          disabled={loading}
        >
          <option value="formal">Formal</option>
          <option value="confident">Confident</option>
          <option value="conversational">Conversational</option>
        </select>
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
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {loading ? (
            <>
              <Loader2 className="ai-tool-submit-spinner" size={18} aria-hidden />
              Generating cover letter…
            </>
          ) : (
            'Generate cover letter'
          )}
        </span>
      </button>
      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>Cover letter</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }} aria-hidden="true">
                  {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </span>
            </button>
            <ExportPdfButton text={output} title="Cover Letter" toolName="Cover Letter Builder" />
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
          <ToolFollowThrough toolType="cover_letter" output={output} />
        </div>
      )}
    </form>
  );
}
