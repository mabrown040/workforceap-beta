'use client';

import PortalVoiceSession from '@/components/portal/PortalVoiceSession';
import VoiceAgentSurface from '@/components/portal/VoiceAgentSurface';
import { counselorStaffVoiceSurface } from '@/lib/portal/voiceAgentSurfaces';
import { getCounselorTtsVoiceId } from '@/lib/portal/counselorVoice';

/**
 * Staff counselor portal — dashboard-style voice chrome + female TTS override for ConvAI.
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
        conversationOverrides={{ tts: { voiceId: getCounselorTtsVoiceId() } }}
      />
    </VoiceAgentSurface>
  );
}
