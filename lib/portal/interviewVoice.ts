export type InterviewerVoiceOption = 'female' | 'male';

const FEMALE_INTERVIEWER_VOICE_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_INTERVIEWER_FEMALE_VOICE_ID?.trim() ||
  '21m00Tcm4TlvDq8ikWAM';

const MALE_INTERVIEWER_VOICE_ID =
  process.env.NEXT_PUBLIC_ELEVENLABS_INTERVIEWER_MALE_VOICE_ID?.trim() ||
  'pNInz6obpgDQGcFmaJgB';

export const INTERVIEWER_VOICE_OPTIONS: Array<{ value: InterviewerVoiceOption; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export function getInterviewerTtsOverrides(voice: InterviewerVoiceOption): {
  voiceId: string;
  stability: number;
  similarityBoost: number;
} {
  return {
    voiceId: voice === 'male' ? MALE_INTERVIEWER_VOICE_ID : FEMALE_INTERVIEWER_VOICE_ID,
    stability: 0.56,
    similarityBoost: 0.78,
  };
}
