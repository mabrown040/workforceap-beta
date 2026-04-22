'use client';

import { useState } from 'react';
import PortalVoiceSession from '@/components/portal/PortalVoiceSession';

const ACCENT = '#0d9488';
const ACCENT_DARK = '#0f766e';

export default function CompactReadinessCoach() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderRadius: '0.75rem',
        border: `1px solid ${ACCENT}30`,
        background: 'var(--surface-container-lowest)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          width: '100%',
          padding: '0.625rem 0.875rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>🎯</span>
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--color-on-surface)',
            flex: 1,
          }}
        >
          Readiness Coach
        </span>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            color: ACCENT,
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
        >
          {open ? 'Collapse ↑' : 'Talk to coach ↓'}
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: '0.75rem 0.875rem 0.875rem',
            borderTop: '1px solid var(--outline-variant)',
          }}
        >
          <PortalVoiceSession
            sessionEndpoint="/api/member/readiness/voice-session"
            completionEndpoint="/api/counselor/feedback"
            title="Talk through your readiness plan"
            description="Ask about interviews, certifications, LinkedIn, or your next milestone."
            accent={ACCENT}
            accentDark={ACCENT_DARK}
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening — share where you are"
          />
        </div>
      )}
    </div>
  );
}
