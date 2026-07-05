'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';
import { FormField } from '@/components/portal/kit';
import ExportPdfButton from './ExportPdfButton';
import ToolFollowThrough from './ToolFollowThrough';

const fieldStyle: React.CSSProperties = {
  marginTop: 4,
  width: '100%',
  fontSize: 14,
  border: '1px solid var(--wa-border)',
  borderRadius: 'var(--wa-radius-sm)',
  padding: '10px 12px',
  outline: 'none',
  background: 'var(--wa-surface)',
  color: 'var(--wa-text)',
  fontFamily: 'inherit',
};

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="wa-grid wa-grid-cols-1 sm:wa-grid-cols-2 wa-gap-3">
        <FormField label="Company name" id="company">
          <input
            id="company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Acme Corp"
            disabled={loading}
            style={fieldStyle}
          />
        </FormField>
        <FormField label="Tone" id="tone">
          <select
            id="tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as 'formal' | 'confident' | 'conversational')}
            disabled={loading}
            style={{ ...fieldStyle, cursor: 'pointer' }}
          >
            <option value="formal">Formal</option>
            <option value="confident">Confident</option>
            <option value="conversational">Conversational</option>
          </select>
        </FormField>
      </div>

      <FormField label="Job description" id="job-desc" full>
        <textarea
          id="job-desc"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job posting here..."
          rows={6}
          required
          disabled={loading}
          style={{ ...fieldStyle, resize: 'vertical', minHeight: 120 }}
        />
      </FormField>

      <FormField label="Your resume / experience" id="resume" full>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume or key experience..."
          rows={8}
          required
          disabled={loading}
          style={{ ...fieldStyle, resize: 'vertical', minHeight: 160 }}
        />
      </FormField>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--wa-danger)' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="wa-kit-focus enabled:hover:wa-opacity-90 enabled:active:wa-scale-[0.98] motion-reduce:active:wa-scale-100 wa-transition-[opacity,transform] wa-duration-150 motion-reduce:wa-transition-none"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 46,
          padding: '10px 20px',
          background: 'var(--wa-accent)',
          color: 'var(--wa-on-accent)',
          fontWeight: 700,
          fontSize: 14,
          borderRadius: 999,
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.75 : 1,
          alignSelf: 'flex-start',
        }}
      >
        {loading ? (
          <>
            <Loader2 size={17} className="wa-animate-spin" aria-hidden />
            Generating cover letter…
          </>
        ) : (
          <>
            <Sparkles size={16} aria-hidden />
            Generate cover letter
          </>
        )}
      </button>

      {output && (
        <div className="wa-kit-card wa-kit-card--sm" style={{ marginTop: '0.25rem' }}>
          <div className="wa-flex wa-items-center wa-justify-between wa-gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--wa-text)', letterSpacing: '-0.01em' }}>
              Cover letter
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleCopy}
                className="wa-kit-focus"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  minHeight: 34,
                  padding: '6px 12px',
                  fontSize: 12.5,
                  fontWeight: 700,
                  borderRadius: 999,
                  border: '1px solid var(--wa-border)',
                  background: 'var(--wa-surface)',
                  color: 'var(--wa-text)',
                  cursor: 'pointer',
                }}
              >
                <span aria-live="polite" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                  {copied ? 'Copied!' : 'Copy to clipboard'}
                </span>
              </button>
              <ExportPdfButton text={output} title="Cover Letter" toolName="Cover Letter Builder" />
            </div>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '1rem',
              borderRadius: 'var(--wa-radius-sm)',
              background: 'var(--wa-bg)',
              border: '1px solid var(--wa-border)',
              color: 'var(--wa-text)',
              fontFamily: 'inherit',
              fontSize: '0.875rem',
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {output}
          </pre>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', color: 'var(--wa-muted)' }}>
            Saved to your history.{' '}
            <Link href="/dashboard/ai-tools/history" style={{ color: 'var(--wa-accent)', fontWeight: 700, textDecoration: 'none' }}>
              View all results
            </Link>
          </p>
          <ToolFollowThrough toolType="cover_letter" output={output} />
        </div>
      )}
    </form>
  );
}
