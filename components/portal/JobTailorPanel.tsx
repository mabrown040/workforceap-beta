'use client';

import { useState } from 'react';
import Link from 'next/link';

type TailorResult = {
  matchScoreBefore: number;
  matchScoreAfter: number;
  tailoredResume: string;
  changes: string[];
  gaps: string[];
};

type TailorResponse = (TailorResult & { ok: true }) | { ok: false; error: string };

function scoreColor(score: number): string {
  if (score >= 75) return '#256b2a';
  if (score >= 50) return '#8a5a00';
  return '#9b1c1c';
}

function ScoreBadge({ label, score }: { label: string; score: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontSize: '1.9rem',
          fontWeight: 900,
          lineHeight: 1,
          color: scoreColor(score),
        }}
      >
        {score}%
      </div>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-on-surface-variant)', marginTop: '0.25rem' }}>
        {label}
      </div>
    </div>
  );
}

export default function JobTailorPanel({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TailorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsResume, setNeedsResume] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showResume, setShowResume] = useState(false);

  async function runTailor() {
    setLoading(true);
    setError(null);
    setNeedsResume(false);
    try {
      const res = await fetch(`/api/ai/job-tailor/${encodeURIComponent(jobId)}`, {
        method: 'POST',
      });
      const data = (await res.json()) as TailorResponse;
      if (!data.ok) {
        if (res.status === 409) setNeedsResume(true);
        else setError(data.error || 'Something went wrong. Please try again.');
        return;
      }
      setResult(data);
      setShowResume(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyResume() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.tailoredResume);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the textarea below is selectable */
    }
  }

  function downloadResume() {
    if (!result) return;
    const blob = new Blob([result.tailoredResume], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tailored-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section
      aria-label="Tailor your resume"
      style={{
        margin: '0 0 1.5rem',
        padding: '1.1rem 1.25rem',
        borderRadius: '0.85rem',
        border: '1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)',
        background: 'color-mix(in srgb, var(--color-accent) 5%, var(--surface-container-low, rgba(0,0,0,0.02)))',
      }}
    >
      <p
        style={{
          margin: '0 0 0.3rem',
          fontSize: '0.72rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)',
        }}
      >
        ✨ AI Resume Tailor
      </p>

      {!result && (
        <>
          <p style={{ margin: '0 0 0.85rem', fontSize: '0.92rem', lineHeight: 1.55, color: 'var(--color-on-surface)' }}>
            See how your resume scores against this job, then get a version rewritten to speak
            this employer&apos;s language — built from your real experience, nothing invented.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void runTailor()}
            disabled={loading}
            aria-busy={loading}
            style={{ fontSize: '0.9rem' }}
          >
            <span aria-live="polite">
              {loading ? 'Tailoring your resume… (~20 sec)' : 'Tailor my resume for this job →'}
            </span>
          </button>
          {needsResume && (
            <p style={{ margin: '0.7rem 0 0', fontSize: '0.87rem', lineHeight: 1.5 }}>
              We need your resume first.{' '}
              <Link href="/dashboard/resume" style={{ fontWeight: 700 }}>
                Upload it in Resume Studio →
              </Link>
            </p>
          )}
          {error && (
            <p role="alert" style={{ margin: '0.7rem 0 0', fontSize: '0.87rem', color: 'var(--color-error, #c83232)' }}>
              {error}
            </p>
          )}
        </>
      )}

      {result && (
        <div>
          {/* Scores */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '0.5rem 0 1rem', flexWrap: 'wrap' }}>
            <ScoreBadge label="Your resume" score={result.matchScoreBefore} />
            <span style={{ fontSize: '1.3rem', color: 'var(--color-on-surface-variant)' }} aria-hidden>
              →
            </span>
            <ScoreBadge label="Tailored" score={result.matchScoreAfter} />
          </div>

          {/* Changes */}
          {result.changes.length > 0 && (
            <div style={{ marginBottom: '0.9rem' }}>
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)' }}>
                What changed
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {result.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <div
              style={{
                marginBottom: '0.9rem',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.55rem',
                background: 'rgba(194,120,0,0.08)',
                border: '1px solid rgba(194,120,0,0.2)',
              }}
            >
              <p style={{ margin: '0 0 0.35rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8a5a00' }}>
                Address these in your cover letter
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                {result.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tailored resume */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <button type="button" className="btn btn-primary" style={{ fontSize: '0.85rem' }} onClick={() => void copyResume()}>
              <span aria-live="polite">
                {copied ? 'Copied ✓' : 'Copy tailored resume'}
              </span>
            </button>
            <button type="button" className="btn btn-outline" style={{ fontSize: '0.85rem' }} onClick={downloadResume}>
              Download .txt
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.85rem' }}
              onClick={() => setShowResume((v) => !v)}
            >
              {showResume ? 'Hide' : 'Show'} resume
            </button>
          </div>
          {showResume && (
            <textarea
              readOnly
              value={result.tailoredResume}
              rows={16}
              aria-label="Tailored resume"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '0.65rem',
                border: '1px solid var(--outline-variant)',
                background: 'var(--color-surface, #fff)',
                fontSize: '0.85rem',
                lineHeight: 1.55,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          )}
          <p style={{ margin: '0.6rem 0 0', fontSize: '0.78rem', color: 'var(--color-on-surface-variant)' }}>
            Saved to your{' '}
            <Link href="/dashboard/ai-tools/history" style={{ fontWeight: 600 }}>
              AI tool history
            </Link>{' '}
            — match scores are AI estimates, not a guarantee.
          </p>
        </div>
      )}
    </section>
  );
}
