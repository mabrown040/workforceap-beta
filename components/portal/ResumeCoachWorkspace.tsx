'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import type { ResumeSuggestion } from '@/components/portal/PortalVoiceSession';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

/**
 * Coordinates voice coach suggestions → live text editor.
 * Hydrates from extracted stored resume on mount.
 * Accept: in-place replace when `original` matches the editor text; otherwise appends a note block.
 * Layout: side-by-side on desktop (resume left, voice coach right), stacked on mobile.
 */
export default function ResumeCoachWorkspace() {
  const [resumeText, setResumeText] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate editor from stored resume on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/member/resume?includePlainText=1')
      .then((r) => r.json())
      .then((d: { resumePlainText?: string | null }) => {
        if (cancelled) return;
        const t = d.resumePlainText?.trim();
        if (t) {
          setResumeText((prev) => (prev.trim() ? prev : t));
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Pass live draft to the coach session as context
  const sessionPayload = useMemo(() => ({ liveResumeDraft: resumeText }), [resumeText]);

  const handleAccept = useCallback((s: ResumeSuggestion) => {
    setResumeText((prev) => {
      const o = s.original?.trim();
      if (o && prev.includes(o)) {
        // In-place replace — user sees the change right where it is
        return prev.replace(o, s.suggested);
      }
      // Fallback: append labeled block
      const line = s.original
        ? `[Change] "${s.original}" → "${s.suggested}" (${s.context})`
        : `[Add] ${s.suggested} (${s.context})`;
      return prev.trim()
        ? `${prev}\n\n--- Coach suggestion (accepted) ---\n${line}`
        : `--- Coach suggestion (accepted) ---\n${line}`;
    });
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        marginTop: '1.5rem',
      }}
    >
      {/* Left panel: Resume editor */}
      <div style={{ flex: '1 1 300px', minWidth: 280 }}>
        <div
          className="stitch-card"
          style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)' }}
        >
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Live Resume Draft</h4>
          <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {hydrated
              ? 'Your resume is loaded. Accept suggestions to apply changes inline.'
              : 'Loading your resume…'}
          </p>
          {hydrated ? (
            <ResumeRewriterForm resumeControlled={resumeText} onResumeChange={setResumeText} />
          ) : (
            <div style={{
              height: 200,
              background: 'var(--surface-container)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-on-surface-variant)',
              fontSize: '0.875rem',
            }}>
              Loading…
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Voice coach */}
      <div style={{ flex: '1 1 300px', minWidth: 280 }}>
        <div
          className="stitch-card"
          style={{ padding: '1.5rem', border: '1px solid var(--outline-variant)' }}
        >
          <h2
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-on-surface-variant)',
              marginBottom: '1rem',
            }}
          >
            Resume Coach (Voice)
          </h2>
          <PortalVoiceSession
            sessionEndpoint="/api/member/resume-coach/session"
            sessionPayload={sessionPayload}
            suggestionsEndpoint="/api/member/resume-coach/parse-suggestions"
            title="Talk through your resume"
            description="Practice your pitch, discuss experience bullets, or get advice on framing your background."
            accent="#2563eb"
            accentDark="#1d4ed8"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening — describe your background"
            onAcceptSuggestion={handleAccept}
          />
        </div>
      </div>
    </div>
  );
}
