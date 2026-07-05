'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Loader2, Search, Copy, Check, UploadCloud } from 'lucide-react';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useHydrateMemberResumePlainText } from '@/hooks/useHydrateMemberResumePlainText';
import { FormField } from '@/components/portal/kit';

import ToolFollowThrough from './ToolFollowThrough';

const textareaStyle: React.CSSProperties = {
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
  resize: 'vertical',
  minHeight: 220,
};

export default function GapAnalyzerForm() {
  const [resume, setResume] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { copy, copied } = useCopyToClipboard();

  useHydrateMemberResumePlainText(setResume);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('gap-analyzer', 'Resume Gap Analyzer');

    try {
      const res = await fetch('/api/ai/gap-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume }),
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <FormField label="Your resume (paste or upload PDF/DOCX)" id="resume">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <label
            htmlFor="resume-file-input"
            className="wa-kit-focus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 36,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 999,
              border: '1px solid var(--wa-border)',
              background: 'var(--wa-surface-2)',
              color: 'var(--wa-text)',
              cursor: extracting || loading ? 'not-allowed' : 'pointer',
              opacity: extracting || loading ? 0.6 : 1,
            }}
          >
            <UploadCloud size={14} aria-hidden />
            Upload resume file
          </label>
          <input
            ref={fileInputRef}
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileUpload}
            disabled={extracting || loading}
            className="sr-only"
          />
          {extracting && (
            <span style={{ fontSize: '0.8rem', color: 'var(--wa-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={13} className="wa-animate-spin" aria-hidden />
              Extracting text…
            </span>
          )}
        </div>
        <textarea
          id="resume"
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          placeholder="Paste your resume here..."
          rows={12}
          required
          disabled={loading}
          className="wa-kit-focus"
          style={textareaStyle}
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
            Analyzing gaps…
          </>
        ) : (
          <>
            <Search size={16} aria-hidden />
            Analyze gaps
          </>
        )}
      </button>

      {output && (
        <div className="wa-kit-card wa-kit-card--sm" style={{ marginTop: '0.25rem' }}>
          <div className="wa-flex wa-items-center wa-justify-between wa-gap-2" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--wa-text)', letterSpacing: '-0.01em' }}>
              Gap analysis
            </h3>
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
          <ToolFollowThrough toolType="gap_analyzer" />
        </div>
      )}
    </form>
  );
}
