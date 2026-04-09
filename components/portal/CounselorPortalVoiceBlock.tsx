'use client';

import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { counselorStaffVoiceSurface } from '@/lib/portal/voice';

/**
 * Staff counselor portal — voice uses the ConvAI agent’s configured TTS (no client `voice_id` override;
 * ElevenLabs rejects overrides when the agent disallows them — see workspace agent settings).
 */
export default function CounselorPortalVoiceBlock() {
  return (
    <VoiceAgentSurface {...counselorStaffVoiceSurface}>
      <PortalVoiceSession
        sessionEndpoint="/api/counselor/session"
        title="Counselor voice assistant"
        description="Talk through student support, outreach, or how to use this portal."
        accent="#c026d3"
        accentDark="#86198f"
        speakingLabel="Assistant is speaking…"
        listeningLabel="Listening — ask your question"
      />
    </VoiceAgentSurface>
  );
}
