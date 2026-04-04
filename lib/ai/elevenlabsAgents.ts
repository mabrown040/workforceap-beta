/**
 * Maps portal features to ElevenLabs Conversational AI agent env vars.
 * Set these in Vercel / `.env` alongside `ELEVENLABS_API_KEY`.
 */

import { createConversationalSession } from '@/lib/ai/elevenlabs';

export type ElevenLabsPortalAgentKey =
  | 'interview'
  | 'counselor'
  | 'employer'
  | 'readiness'
  | 'resume_coach'
  | 'partner';

const ENV_KEYS: Record<ElevenLabsPortalAgentKey, string> = {
  interview: 'ELEVENLABS_INTERVIEW_AGENT_ID',
  counselor: 'ELEVENLABS_COUNSELOR_AGENT_ID',
  employer: 'ELEVENLABS_EMPLOYER_AGENT_ID',
  readiness: 'ELEVENLABS_READINESS_AGENT_ID',
  resume_coach: 'ELEVENLABS_RESUME_COACH_AGENT_ID',
  partner: 'ELEVENLABS_PARTNER_AGENT_ID',
};

/** Defaults preserve behavior if env is unset (interview + counselor only). */
const FALLBACK_AGENT_IDS: Partial<Record<ElevenLabsPortalAgentKey, string>> = {
  interview: 'agent_9001kmy4g522e5ttvj88k5z1ygem',
  counselor: 'agent_2801kmznvsemfmms06r0e02es1b9',
};

export function getElevenLabsAgentId(key: ElevenLabsPortalAgentKey): string | undefined {
  const fromEnv = process.env[ENV_KEYS[key]]?.trim();
  if (fromEnv) return fromEnv;
  return FALLBACK_AGENT_IDS[key];
}

export function envKeyForPortalAgent(key: ElevenLabsPortalAgentKey): string {
  return ENV_KEYS[key];
}

export async function startElevenLabsPortalSession(
  key: ElevenLabsPortalAgentKey,
  options?: { dynamicContext?: string }
) {
  const agentId = getElevenLabsAgentId(key);
  if (!agentId) {
    throw new Error(`No ElevenLabs agent ID for "${key}". Set ${ENV_KEYS[key]}.`);
  }
  return createConversationalSession(agentId, options);
}
