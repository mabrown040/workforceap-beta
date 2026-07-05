'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { } from 'lucide-react';
import { PortalInlineSpinner } from '@/components/portal/PortalInlineSpinner';
import { trackToolLaunch } from '@/lib/analytics/events';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { useDraftAutosave } from '@/hooks/useDraftAutosave';
import ToolFollowThrough from './ToolFollowThrough';

const RESUME_PREFILL_MAX = 3500;

export default function LinkedInAboutForm() {
  const [role, setRole] = useState('');
  const [bullets, setBullets] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(true);
  const { copy, copied } = useCopyToClipboard();
  const userEditedBullets = useRef(false);

  // Persist `role` only. `bullets` has existing server-prefill logic; mixing
  // autosave with that prefill+override-tracking would duplicate state intent.
  useDraftAutosave('ai-tool:linkedin-about:role', role, setRole);

  useEffect(() => {
    let cancelled = false;
    setResumeLoading(true);
    fetch('/api/member/resume?includePlainText=1')
      .then((r) => r.json())
      .then(
        (d: {
          resumePlainText?: string | null;
          hasOriginal?: boolean;
          hasEnhanced?: boolean;
        }) => {
          if (cancelled) return;
          const t = d.resumePlainText?.trim();
          if (!t || t.length < 40) {
            setResumeLoading(false);
            return;
          }
          setResumeLoaded(true);
          if (!userEditedBullets.current) {
            const prefill = t.length > RESUME_PREFILL_MAX ? `${t.slice(0, RESUME_PREFILL_MAX)}\n…` : t;
            setBullets((prev) => (prev.trim() ? prev : prefill));
          }
        }
      )
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResumeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOutput('');
    setLoading(true);
    trackToolLaunch('linkedin-about', 'LinkedIn About Section Generator');

    try {
      const res = await fetch('/api/ai/linkedin-about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, bullets })});

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
      {resumeLoading ? (
        <p className="ai-tool-resume-hint" style={{ fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          Checking for a saved resume…
        </p>
      ) : resumeLoaded ? (
        <div
          className="portal-card portal-card--flat"
          style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            background: 'var(--surface-container-low)',
            border: '1px solid var(--outline-variant)',
            fontSize: '0.88rem',
            lineHeight: 1.45}}
        >
          <strong style={{ color: 'var(--color-on-surface)' }}>Resume on file</strong>
          <span style={{ color: 'var(--color-on-surface-variant)' }}>
            {' '}
            — Text below is prefilled from your stored resume. Edit it or add focus bullets. The generator also uses your full resume on the server when available.
          </span>
          <div style={{ marginTop: '0.5rem' }}>
            <Link href="/dashboard/resume" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              View or update resume
            </Link>
          </div>
        </div>
      ) : (
        <p className="ai-tool-resume-hint" style={{ fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', marginBottom: '1rem' }}>
          No resume text found yet.{' '}
          <Link href="/dashboard/resume" style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
            Upload a resume
          </Link>{' '}
          to prefill this section automatically next time.
        </p>
      )}

      <div className="form-group">
        <label htmlFor="role">Target role / job title</label>
        <input
          id="role"
          type="text"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Software Developer, Project Manager"
          required
          disabled={loading}
        />
      </div>
      <div className="form-group">
        <label htmlFor="bullets">Highlights (bullets or resume excerpt)</label>
        <textarea
          id="bullets"
          value={bullets}
          onChange={(e) => {
            userEditedBullets.current = true;
            setBullets(e.target.value);
          }}
          placeholder={
            '• 5 years in IT support\n• Led migration to cloud\n• CompTIA A+ certified\n\nOr paste your resume summary here — if you have a file on file, it may load automatically.'
          }
          rows={10}
          required
          disabled={loading}
        />
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading ? (
          <>
            <PortalInlineSpinner size={18} />
            Generating About section…
          </>
        ) : (
          'Generate About section'
        )}
      </button>
      {output && (
        <div className="resume-rewriter-output">
          <div className="resume-rewriter-output-header">
            <h3>LinkedIn About section</h3>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleCopy}>
              <span aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }} aria-hidden="true">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied!" : "Copy to clipboard"}
              </span>

            </button>
          </div>
          <pre className="resume-rewriter-output-content">{output}</pre>
          <p className="ai-result-saved">
            Saved to your history. <Link href="/dashboard/ai-tools/history">View all results</Link>
          </p>
          <ToolFollowThrough toolType="linkedin_about" />
        </div>
      )}
    </form>
  );
}
