/**
 * Maps portal features to ElevenLabs Conversational AI agent env vars.
 * Set these in Vercel / `.env` alongside `ELEVENLABS_API_KEY`.
 */

import { clampElevenLabsDynamicVariables } from '@/lib/ai/clampElevenLabsDynamicVariables';
import { createConversationalSession } from '@/lib/ai/elevenlabs';

export type ElevenLabsPortalAgentKey =
  | 'interview'
  | 'counselor'
  | 'counselor_staff'
  | 'employer'
  | 'readiness'
  | 'resume_coach'
  | 'partner'
  | 'wioa_prequal'
  | 'career_business';

const ENV_KEYS: Record<ElevenLabsPortalAgentKey, string> = {
  interview: 'ELEVENLABS_INTERVIEW_AGENT_ID',
  counselor: 'ELEVENLABS_COUNSELOR_AGENT_ID',
  counselor_staff: 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID',
  employer: 'ELEVENLABS_EMPLOYER_AGENT_ID',
  readiness: 'ELEVENLABS_READINESS_AGENT_ID',
  resume_coach: 'ELEVENLABS_RESUME_COACH_AGENT_ID',
  partner: 'ELEVENLABS_PARTNER_AGENT_ID',
  wioa_prequal: 'ELEVENLABS_WIOA_PREQUAL_AGENT_ID',
  career_business: 'ELEVENLABS_CAREER_BUSINESS_AGENT_ID',
};

const RETIRED_COUNSELOR_AGENT_IDS = new Set([
  'agent_2801kmznvsemfmms06r0e02es1b9',
]);

/**
 * Defaults if env is unset — production should set `ELEVENLABS_*_AGENT_ID` per deploy.
 * IDs match WorkforceAP agents in the ElevenLabs workspace (ConvAI).
 */
const FALLBACK_AGENT_IDS: Partial<Record<ElevenLabsPortalAgentKey, string>> = {
  interview: 'agent_9001kmy4g522e5ttvj88k5z1ygem',
  // Legacy key name; this agent is Lilley, the member-facing student career coach.
  counselor: 'agent_1101kqfjfm8retm8j6md467wzxdb',
  // Dedicated staff/caseload agent retained for the counselor workspace.
  counselor_staff: 'agent_2801kmznvsemfmms06r0e02es1b9',
  employer: 'agent_0901kmznx45vf19s9psjrctqr6x5',
  partner: 'agent_7601kntxhqx3e0mvznpwk9bqj5yw',
  readiness: 'agent_5801kmznwny0e8gtmb726aaeevnt',
  resume_coach: 'agent_6601kmznw90ffxkbk7mpbym73vh9',
  wioa_prequal: 'agent_6801knv07nb2ftj9p54nm6xem0xj',
  /** Dedicated Career & Business coach agent. */
  career_business: 'agent_2001kv8wn1zhepm9x4tjfdzwm6v8',
};

export type CounselorVoiceSessionPlan =
  | {
      ok: true;
      audience: 'member';
      contextKind: 'member';
      agentKey: 'counselor';
    }
  | {
      ok: true;
      audience: 'staff';
      contextKind: 'staff';
      agentKey: 'counselor_staff';
    }
  | {
      ok: false;
      status: 403;
      error: 'Forbidden';
    };

/**
 * Keep the shared counselor voice endpoint safe for both callers.
 * Member is the conservative default; staff mode is explicit and role-gated.
 */
export function resolveCounselorVoiceSessionPlan(
  requestedAudience: unknown,
  canUseStaffVoice: boolean,
): CounselorVoiceSessionPlan {
  if (requestedAudience !== 'staff') {
    return {
      ok: true,
      audience: 'member',
      contextKind: 'member',
      agentKey: 'counselor',
    };
  }

  if (!canUseStaffVoice) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return {
    ok: true,
    audience: 'staff',
    contextKind: 'staff',
    agentKey: 'counselor_staff',
  };
}

export function getElevenLabsAgentId(key: ElevenLabsPortalAgentKey): string | undefined {
  const fromEnv = process.env[ENV_KEYS[key]]?.trim();
  if (fromEnv && (key !== 'counselor' || !RETIRED_COUNSELOR_AGENT_IDS.has(fromEnv))) {
    return fromEnv;
  }
  if (fromEnv) {
    console.warn(`[elevenlabs] Ignoring retired counselor agent ID from ${ENV_KEYS[key]}.`);
  }
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
