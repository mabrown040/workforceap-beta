'use client';

import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voice';

/**
 * AI toolkit voice section — compact 3-column grid so all coaches are
 * immediately visible without scrolling.
 */
export default function VoiceCoachesPromo() {
  return (
    <section
      aria-label="Voice AI coaches"
      style={{
        maxWidth: '1100px',
        margin: '0 auto 1.5rem',
        padding: '0 clamp(1rem, 4vw, 1.5rem)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.875rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '1.125rem', color: 'var(--color-accent)', fontVariationSettings: "'FILL' 1" }}>mic</span>
        <h2 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-on-surface-variant)', margin: 0 }}>
          Voice AI Coaches
        </h2>
        <span style={{ fontSize: '0.7rem', color: 'var(--color-on-surface-variant)', marginLeft: '0.25rem' }}>Powered by ElevenLabs</span>
      </div>

      {/* 3-column compact grid on desktop, 1-column on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        <VoiceAgentSurface {...readinessVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/member/readiness/voice-session"
            title="Career Readiness"
            description="Talk through interviews, certifications, and next steps."
            accent="#0d9488"
            accentDark="#0f766e"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening…"
          />
        </VoiceAgentSurface>

        <VoiceAgentSurface {...resumeCoachVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/member/resume-coach/session"
            retryWithoutDynamicVariables={false}
            title="Resume & Experience"
            description="Practice how you describe your background out loud."
            accent="#2563eb"
            accentDark="#1d4ed8"
            speakingLabel="Coach is speaking…"
            listeningLabel="Listening…"
          />
        </VoiceAgentSurface>

        <VoiceAgentSurface {...mockInterviewVoiceSurface}>
          <PortalVoiceSession
            sessionEndpoint="/api/member/voice-interview/session"
            title="Voice Interviewer"
            description="Practice interview answers with a live mock interviewer."
            accent="#7c3aed"
            accentDark="#5b21b6"
            speakingLabel="Interviewer is speaking…"
            listeningLabel="Listening…"
          />
        </VoiceAgentSurface>
      </div>
    </section>
  );
}
