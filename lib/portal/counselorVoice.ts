/**
 * ConvAI TTS voice for counselor experiences (member + staff portal).
 * Set NEXT_PUBLIC_ELEVENLABS_COUNSELOR_VOICE_ID to override (ElevenLabs voice ID).
 * Default: Rachel (female, professional).
 */
export function getCounselorTtsVoiceId(): string {
  const v = process.env.NEXT_PUBLIC_ELEVENLABS_COUNSELOR_VOICE_ID?.trim();
  return v && v.length > 0 ? v : '21m00Tcm4TlvDq8ikWAM';
}
