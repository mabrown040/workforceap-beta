'use client';

import { useState, useCallback } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import type { ResumeSuggestion } from '@/components/portal/PortalVoiceSession';
import ResumeRewriterForm from '@/components/portal/tools/ResumeRewriterForm';

/**
 * Coordinates voice coach suggestions → live text editor.
 * When the user accepts a suggestion, it's appended to the rewriter textarea (controlled state).
 */
export default function ResumeCoachWorkspace() {
  const [resumeText, setResumeText] = useState('');

  const handleAccept = useCallback((s: ResumeSuggestion) => {
    const line = s.original
      ? `[Change] "${s.original}" → "${s.suggested}" (${s.context})`
      : `[Add] ${s.suggested} (${s.context})`;
    setResumeText((prev) =>
      prev.trim()
        ? `${prev}\n\n--- Coach suggestion (accepted) ---\n${line}`
        : `--- Coach suggestion (accepted) ---\n${line}`
    );
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
        <PortalVoiceSession
          sessionEndpoint="/api/member/resume-coach/session"
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
