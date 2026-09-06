export const INTERVIEW_VOICE_GREETING_EN =
  'Hi - I am your WorkforceAP interview coach. Tell me when you are ready, and I will start your mock interview at the right level for this role.';

export const INTERVIEW_VOICE_GREETING_ES =
  'Hola. Soy tu coach de entrevistas de WorkforceAP. Dime cuando estés listo y comenzaré tu entrevista simulada al nivel adecuado para este puesto.';

/** Fixed copy only: never turn a request field or member context into instructions. */
export function getInterviewVoiceGreeting(language: unknown): string {
  return language === 'es' ? INTERVIEW_VOICE_GREETING_ES : INTERVIEW_VOICE_GREETING_EN;
}
