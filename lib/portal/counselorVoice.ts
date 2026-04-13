/**
 * TTS overrides for the WIOA pre-qualification guide.
 *
 * Uses a dedicated WIOA env var when present, then falls back to the counselor voice env var,
 * then Rachel (female, professional). We also slow delivery slightly and increase stability a bit
 * so the guide feels softer and more empathetic during screening.
 */
export function getWioaGuideTtsOverrides(): {
  voiceId: string;
  speed: number;
  stability: number;
  similarityBoost: number;
} {
  const voiceId =
    process.env.NEXT_PUBLIC_ELEVENLABS_WIOA_VOICE_ID?.trim() ||
    process.env.NEXT_PUBLIC_ELEVENLABS_COUNSELOR_VOICE_ID?.trim() ||
    '21m00Tcm4TlvDq8ikWAM';

  return {
    voiceId,
    speed: 0.94,
    stability: 0.72,
    similarityBoost: 0.8,
  };
}
