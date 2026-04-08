'use client';

import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { mockInterviewVoiceSurface, readinessVoiceSurface, resumeCoachVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';

/** Member home (`/dashboard`) — show all three voice options in a tighter horizontal row on desktop. */
export default function MemberDashboardVoiceSection() {
  return (
    <section aria-label="Voice assistants">
      <h2
        className="wa-text-xs wa-font-bold wa-uppercase wa-tracking-[0.1em]"
        style={{ color: 'var(--color-on-surface-variant)', marginBottom: '0.75rem' }}
      >
        Voice assistants
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'start',
        }}
      >
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
