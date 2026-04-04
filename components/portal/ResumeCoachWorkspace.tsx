'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import type { ResumeSuggestion } from '@/components/portal/PortalVoiceSession';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

/**
 * Coordinates voice coach suggestions → live text editor.
 * Hydrates from extracted stored resume; passes live draft to the coach session as context.
 * Accept: applies in-place replace when `original` matches the editor; otherwise appends a note block.
 */
export default function ResumeCoachWorkspace() {
  const [resumeText, setResumeText] = useState('');
  const [hydrated, setHydrated] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, []);

  const sessionPayload = useMemo(() => ({ liveResumeDraft: resumeText }), [resumeText]);

  const handleAccept = useCallback((s: ResumeSuggestion) => {
    setResumeText((prev) => {
      const o = s.original?.trim();
      if (o && prev.includes(o)) {
        return prev.replace(o, s.suggested);
      }
      const line = s.original
        ? `[Change] "${s.original}" → "${s.suggested}" (${s.context})`
        : `[Add] ${s.suggested} (${s.context})`;
      return prev.trim()
        ? `${prev}\n\n--- Coach suggestion (accepted) ---\n${line}`
        : `--- Coach suggestion (accepted) ---\n${line}`;
    });
  }, []);

  return (
    <>
      <div
        className="stitch-card"
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          border: '1px solid var(--outline-variant)',
        }}
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
          Resume coach (voice)
        </h2>
        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1rem',
            lineHeight: 1.5,
          }}
        >
          The coach receives your uploaded resume (PDF/DOCX extracted to text), plus whatever is in{' '}
          <strong>Live resume edits</strong> below when you press Start — keep that area in sync with what you want
          feedback on.
        </p>
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
        {!hydrated ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-on-surface-variant)', marginTop: '0.75rem' }}>
            Loading saved resume text…
          </p>
        ) : null}
      </div>

      <div
        className="stitch-card"
        style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          border: '1px solid var(--outline-variant)',
        }}
      >
        <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>Live resume edits</h4>
        <p
          style={{
            color: 'var(--color-on-surface-variant)',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          Rewrite bullets, tailor for a target role, and keep your resume work on the same page as
          your upload and preview.
        </p>
        <ResumeRewriterForm resumeControlled={resumeText} onResumeChange={setResumeText} />
      </div>
    </>
  );
}
