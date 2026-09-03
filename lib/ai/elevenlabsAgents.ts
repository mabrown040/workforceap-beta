/** Portal compatibility layer backed by the authoritative ElevenLabs registry. */

import { clampElevenLabsDynamicVariables } from '@/lib/ai/clampElevenLabsDynamicVariables';
import { ElevenLabsApiError, createConversationalSession } from '@/lib/ai/elevenlabs';
import {
  ELEVENLABS_AGENT_KEYS,
  ELEVENLABS_AGENT_REGISTRY,
  LILLEY_STUDENT_COACH_AGENT_ID,
  environmentKeyForElevenLabsAgent,
  resolveElevenLabsAgent,
  type ElevenLabsAgentKey,
} from '@/lib/elevenlabs/agentRegistry';

export type ElevenLabsPortalAgentKey = ElevenLabsAgentKey;
export { LILLEY_STUDENT_COACH_AGENT_ID };

export const FALLBACK_AGENT_IDS = Object.fromEntries(
  ELEVENLABS_AGENT_KEYS.flatMap((key) => {
    const resolution = ELEVENLABS_AGENT_REGISTRY[key].resolution;
    return resolution.mode === 'env-with-reviewed-fallback'
      ? [[key, resolution.reviewedFallbackAgentId] as const]
      : [];
  }),
) as Partial<Record<ElevenLabsPortalAgentKey, string>>;

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
  const result = resolveElevenLabsAgent(key);
  if (!result.ok) return undefined;
  if (result.ignoredEnvironmentReason) {
    console.warn(
      `[elevenlabs] Ignoring ${result.ignoredEnvironmentReason} value from ${result.environmentKey}.`,
    );
  }
  return result.agentId;
}

export function envKeyForPortalAgent(key: ElevenLabsPortalAgentKey): string {
  return environmentKeyForElevenLabsAgent(key);
}

export async function startElevenLabsPortalSession(
  key: ElevenLabsPortalAgentKey,
  options?: {
    dynamicVariables?: Record<string, string | number | boolean>;
    locale?: string;
    branchId?: string;
  }
): Promise<{
  signedUrl: string;
  expiresAt?: string;
  conversationId?: string;
  dynamicVariables?: Record<string, string>;
}> {
  const agentId = getElevenLabsAgentId(key);
  if (!agentId) {
    throw new Error(`No ElevenLabs agent ID for "${key}". Set ${envKeyForPortalAgent(key)}.`);
  }
  const sessionOptions = options?.branchId ? { branchId: options.branchId } : {};
  let session: Awaited<ReturnType<typeof createConversationalSession>>;
  try {
    session = await createConversationalSession(agentId, sessionOptions);
  } catch (error) {
    // A 404 means the configured / reviewed agent id no longer exists in the
    // live ElevenLabs account (this is what broke WIOA conversation practice
    // after the April account migration). Recover once with the id the
    // migration record says this role was re-created under, and tell ops which
    // env var to set so the recovery stops being needed.
    const migratedAgentId = ELEVENLABS_AGENT_REGISTRY[key].historicalMigration?.migratedAgentId;
    const canRecover =
      error instanceof ElevenLabsApiError &&
      error.status === 404 &&
      !!migratedAgentId &&
      migratedAgentId !== agentId;
    if (!canRecover) throw error;
    console.warn(
      `[elevenlabs] Agent ${agentId} for "${key}" returned 404; retrying with the migrated agent ${migratedAgentId}. Set ${envKeyForPortalAgent(key)} to the live agent id.`,
    );
    session = await createConversationalSession(migratedAgentId, sessionOptions);
  }
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
