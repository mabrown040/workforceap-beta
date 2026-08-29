'use client';

import PortalVoiceSessionLazy from '@/components/portal/PortalVoiceSessionLazy';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { counselorStaffVoiceSurface } from '@/lib/portal/voice';

/**
 * Staff counselor portal — voice uses the ConvAI agent’s configured TTS (no client `voice_id` override;
 * ElevenLabs rejects overrides when the agent disallows them — see workspace agent settings).
 */
export default function CounselorPortalVoiceBlock() {
  return (
    <VoiceAgentSurface {...counselorStaffVoiceSurface}>
      <PortalVoiceSessionLazy
        sessionEndpoint="/api/counselor/session"
        sessionPayload={{ audience: 'staff' }}
        title="Counselor voice assistant"
        titleAs="h2"
        description="Talk through member support, outreach, or how to use this portal."
        accent="#c026d3"
        accentDark="#86198f"
        speakingLabel="Assistant is speaking…"
        listeningLabel="Listening — ask your question"
      />
    </VoiceAgentSurface>
  );
}
