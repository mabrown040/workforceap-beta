/**
 * Maps portal features to ElevenLabs Conversational AI agent env vars.
 * Set these in Vercel / `.env` alongside `ELEVENLABS_API_KEY`.
 */

import { clampElevenLabsDynamicVariables } from '@/lib/ai/clampElevenLabsDynamicVariables';
import { createConversationalSession } from '@/lib/ai/elevenlabs';

export type ElevenLabsPortalAgentKey =
  | 'interview'
  | 'counselor'
  | 'employer'
  | 'readiness'
  | 'resume_coach'
  | 'partner'
  | 'wioa_prequal'
  | 'career_business';

const ENV_KEYS: Record<ElevenLabsPortalAgentKey, string> = {
  interview: 'ELEVENLABS_INTERVIEW_AGENT_ID',
  counselor: 'ELEVENLABS_COUNSELOR_AGENT_ID',
  employer: 'ELEVENLABS_EMPLOYER_AGENT_ID',
  readiness: 'ELEVENLABS_READINESS_AGENT_ID',
  resume_coach: 'ELEVENLABS_RESUME_COACH_AGENT_ID',
  partner: 'ELEVENLABS_PARTNER_AGENT_ID',
  wioa_prequal: 'ELEVENLABS_WIOA_PREQUAL_AGENT_ID',
  career_business: 'ELEVENLABS_CAREER_BUSINESS_AGENT_ID',
};

/**
 * Defaults if env is unset — production should set `ELEVENLABS_*_AGENT_ID` per deploy.
 * IDs match WorkforceAP agents in the ElevenLabs workspace (ConvAI).
 */
const FALLBACK_AGENT_IDS: Partial<Record<ElevenLabsPortalAgentKey, string>> = {
  interview: 'agent_9001kmy4g522e5ttvj88k5z1ygem',
  counselor: 'agent_2801kmznvsemfmms06r0e02es1b9',
  employer: 'agent_0901kmznx45vf19s9psjrctqr6x5',
  partner: 'agent_7601kntxhqx3e0mvznpwk9bqj5yw',
  readiness: 'agent_5801kmznwny0e8gtmb726aaeevnt',
  resume_coach: 'agent_6601kmznw90ffxkbk7mpbym73vh9',
  wioa_prequal: 'agent_6801knv07nb2ftj9p54nm6xem0xj',
  /** Dedicated Career & Business coach agent. */
  career_business: 'agent_2001kv8wn1zhepm9x4tjfdzwm6v8',
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
  options?: { dynamicVariables?: Record<string, string | number | boolean>; locale?: string }
): Promise<{
  signedUrl: string;
  expiresAt?: string;
  dynamicVariables?: Record<string, string>;
}> {
  const agentId = getElevenLabsAgentId(key);
  if (!agentId) {
    throw new Error(`No ElevenLabs agent ID for "${key}". Set ${ENV_KEYS[key]}.`);
  }
  const session = await createConversationalSession(agentId);
  const dynamicVariables = options?.dynamicVariables
    ? clampElevenLabsDynamicVariables({
        ...options.dynamicVariables,
        locale: options.locale ?? 'en',
      })
    : { locale: options?.locale ?? 'en' };
  return {
    ...session,
    ...(dynamicVariables ? { dynamicVariables } : {}),
  };
}
