/**
 * Data-transfer contract for the ElevenLabs resume-coach session.
 * Keep the server, live contextual updates, and pre-start disclosure aligned.
 */
export const RESUME_COACH_INITIAL_TEXT_MAX_CHARS = 4000;
export const RESUME_COACH_LIVE_DRAFT_MAX_CHARS = 5800;

export const RESUME_COACH_DATA_USE_NOTICE =
  'By starting, you send microphone audio and the live transcript to ElevenLabs. At session start, we also send your name, organization, current program and skills, interview eligibility, prior coach-memory summary, and up to 4,000 characters each of your extracted resume and current draft. While you edit, updated draft context may send up to 5,800 characters. Remove sensitive identifiers first.';
