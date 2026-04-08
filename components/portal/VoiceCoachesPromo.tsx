'use client';

import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';

/**
 * AI toolkit voice section: all three member voice options visible immediately, stacked vertically.
 */
export default function VoiceCoachesPromo() {
  return (
    <section
      aria-label="Voice AI coaches"
      style={{
        maxWidth: '1100px',
        margin: '0 auto 2rem',
        padding: '0 clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <p
          className="wa-text-[10px] wa-uppercase wa-tracking-[0.14em] wa-font-bold"
          style={{ color: 'var(--color-accent)', margin: '0 0 0.5rem' }}
        >
          Voice AI
        </p>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
          Talk it out with your coaches
        </h2>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-on-surface-variant)', lineHeight: 1.55, maxWidth: '42rem' }}>
          Natural voice sessions powered by ElevenLabs. Your program and organization context is passed to the coach automatically.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '0.9rem' }}>
        <VoiceAgentSurface {...readinessVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/member/readiness/voice-session"
            title="Career Readiness"
            description="Talk through interviews, certifications, and next steps with your coach."
            accent="#0d9488"
            accentDark="#0f766e"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening — share where you are"
          />
        </VoiceAgentSurface>

        <VoiceAgentSurface {...resumeCoachVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/member/resume-coach/session"
            retryWithoutDynamicVariables={false}
            title="Resume & Experience"
            description="Practice how you describe your background and target role out loud."
            accent="#2563eb"
            accentDark="#1d4ed8"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening — describe your background"
          />
        </VoiceAgentSurface>

        <VoiceAgentSurface {...mockInterviewVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/member/voice-interview/session"
            title="Voice Interviewer"
            description="Practice interview answers out loud with a live mock interviewer."
            accent="#7c3aed"
            accentDark="#5b21b6"
            speakingLabel="Interviewer is speaking…"
            listeningLabel="Listening — answer the question"
          />
        </VoiceAgentSurface>
      </div>
    </section>
  );
}
