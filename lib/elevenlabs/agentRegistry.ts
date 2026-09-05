/**
 * Authoritative WorkforceAP registry for ElevenLabs Conversational AI agents.
 *
 * Keep active runtime configuration separate from historical migration evidence:
 * a migration ID is never promoted to a runtime fallback merely because it was
 * recorded by the April 2026 account migration.
 * The nonprofit targets below were re-read and patched on 2026-09-05.
 */

import {
  MEMBER_AGENT_TOOL_NAMES,
  type MemberAgentToolName,
} from '@/lib/agents/gateway/types';

export const ELEVENLABS_AGENT_KEYS = [
  'interview',
  'counselor',
  'counselor_staff',
  'employer',
  'readiness',
  'resume_coach',
  'partner',
  'wioa_prequal',
  'career_business',
] as const;

export type ElevenLabsAgentKey = (typeof ELEVENLABS_AGENT_KEYS)[number];

export type ElevenLabsAgentId = `agent_${string}`;

export type ElevenLabsAgentAudience =
  | 'member'
  | 'staff'
  | 'employer'
  | 'partner'
  | 'anonymous';

export type ElevenLabsAgentExposure = 'private' | 'public';

export type ElevenLabsAgentEnvironmentKey =
  | 'ELEVENLABS_INTERVIEW_AGENT_ID'
  | 'ELEVENLABS_COUNSELOR_AGENT_ID'
  | 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID'
  | 'ELEVENLABS_EMPLOYER_AGENT_ID'
  | 'ELEVENLABS_READINESS_AGENT_ID'
  | 'ELEVENLABS_RESUME_COACH_AGENT_ID'
  | 'ELEVENLABS_PARTNER_AGENT_ID'
  | 'ELEVENLABS_WIOA_PREQUAL_AGENT_ID'
  | 'ELEVENLABS_CAREER_BUSINESS_AGENT_ID';

type EnvironmentOverridePolicy =
  | {
      readonly kind: 'valid-agent-id';
    }
  | {
      readonly kind: 'reviewed-agent-ids';
      readonly agentIds: readonly ElevenLabsAgentId[];
    };

type ReviewedFallbackResolution = {
  readonly mode: 'env-with-reviewed-fallback';
  readonly reviewedFallbackAgentId: ElevenLabsAgentId;
  readonly failClosed: false;
};

type EnvironmentOnlyResolution = {
  readonly mode: 'env-only';
  readonly reviewedFallbackAgentId: null;
  readonly failClosed: true;
};

export type ElevenLabsAgentRegistryEntry = {
  readonly displayName: string;
  readonly audiences: readonly ElevenLabsAgentAudience[];
  /** Public means an anonymous route can mint a session for this agent. */
  readonly exposure: ElevenLabsAgentExposure;
  readonly environmentKey: ElevenLabsAgentEnvironmentKey;
  readonly environmentOverridePolicy: EnvironmentOverridePolicy;
  readonly resolution: ReviewedFallbackResolution | EnvironmentOnlyResolution;
  /** Read-only member tools granted to a session for this exact agent role. */
  readonly allowedMemberTools: readonly MemberAgentToolName[];
  /** Patch files present in the repository; these are evidence, not fallbacks. */
  readonly checkedInPatchAgentIds: readonly ElevenLabsAgentId[];
  /**
   * Account-migration references retained only for drift audits. These IDs are
   * not accepted or selected unless separately configured by active policy.
   */
  readonly historicalMigration: Readonly<{
    sourceAgentId: ElevenLabsAgentId;
    migratedAgentId: ElevenLabsAgentId;
    recordedAt: '2026-04-30';
  }> | null;
};

export const LILLEY_STUDENT_COACH_AGENT_ID =
  'agent_1101kqfjfm8retm8j6md467wzxdb' as const satisfies ElevenLabsAgentId;

export const RESUME_COACH_REVIEWED_AGENT_ID =
  'agent_9101kqfjg2z8ew5r3ad4fz6323yr' as const satisfies ElevenLabsAgentId;

const reviewedOnly = (
  ...agentIds: readonly ElevenLabsAgentId[]
): EnvironmentOverridePolicy => ({
  kind: 'reviewed-agent-ids',
  agentIds,
});

const anyValidAgentId: EnvironmentOverridePolicy = { kind: 'valid-agent-id' };

export const ELEVENLABS_AGENT_REGISTRY = {
  interview: {
    displayName: 'WorkforceAP Interview Coach',
    audiences: ['member', 'staff'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_INTERVIEW_AGENT_ID',
    environmentOverridePolicy: anyValidAgentId,
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: 'agent_4601kqfjaz5rf09bya66s9gg1wvc',
      failClosed: false,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: ['agent_4601kqfjaz5rf09bya66s9gg1wvc'],
    historicalMigration: {
      sourceAgentId: 'agent_9001kmy4g522e5ttvj88k5z1ygem',
      migratedAgentId: 'agent_4601kqfjaz5rf09bya66s9gg1wvc',
      recordedAt: '2026-04-30',
    },
  },
  counselor: {
    displayName: 'Lilley - WorkforceAP Student Career Coach',
    audiences: ['member'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_COUNSELOR_AGENT_ID',
    environmentOverridePolicy: reviewedOnly(LILLEY_STUDENT_COACH_AGENT_ID),
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: LILLEY_STUDENT_COACH_AGENT_ID,
      failClosed: false,
    },
    allowedMemberTools: MEMBER_AGENT_TOOL_NAMES,
    checkedInPatchAgentIds: [LILLEY_STUDENT_COACH_AGENT_ID],
    historicalMigration: null,
  },
  counselor_staff: {
    displayName: 'WorkforceAP Counselor Assistant',
    audiences: ['staff'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_COUNSELOR_STAFF_AGENT_ID',
    environmentOverridePolicy: anyValidAgentId,
    resolution: {
      mode: 'env-only',
      reviewedFallbackAgentId: null,
      failClosed: true,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: [],
    historicalMigration: {
      sourceAgentId: 'agent_2801kmznvsemfmms06r0e02es1b9',
      migratedAgentId: 'agent_1101kqfjfm8retm8j6md467wzxdb',
      recordedAt: '2026-04-30',
    },
  },
  employer: {
    displayName: 'WorkforceAP Employer Concierge',
    audiences: ['employer'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_EMPLOYER_AGENT_ID',
    environmentOverridePolicy: anyValidAgentId,
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: 'agent_6301kqfjfpexew9bnd64vs8nr7ak',
      failClosed: false,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: ['agent_6301kqfjfpexew9bnd64vs8nr7ak'],
    historicalMigration: {
      sourceAgentId: 'agent_0901kmznx45vf19s9psjrctqr6x5',
      migratedAgentId: 'agent_6301kqfjfpexew9bnd64vs8nr7ak',
      recordedAt: '2026-04-30',
    },
  },
  readiness: {
    displayName: 'WorkforceAP Career Readiness Coach',
    audiences: ['member'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_READINESS_AGENT_ID',
    environmentOverridePolicy: anyValidAgentId,
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: 'agent_9201kqfjfrkyex086d2cb706xsb0',
      failClosed: false,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: ['agent_9201kqfjfrkyex086d2cb706xsb0'],
    historicalMigration: {
      sourceAgentId: 'agent_5801kmznwny0e8gtmb726aaeevnt',
      migratedAgentId: 'agent_9201kqfjfrkyex086d2cb706xsb0',
      recordedAt: '2026-04-30',
    },
  },
  resume_coach: {
    displayName: 'WorkforceAP Student Resume Coach',
    audiences: ['member', 'staff'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_RESUME_COACH_AGENT_ID',
    environmentOverridePolicy: reviewedOnly(RESUME_COACH_REVIEWED_AGENT_ID),
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: RESUME_COACH_REVIEWED_AGENT_ID,
      failClosed: false,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: [RESUME_COACH_REVIEWED_AGENT_ID],
    historicalMigration: {
      sourceAgentId: 'agent_6601kmznw90ffxkbk7mpbym73vh9',
      migratedAgentId: 'agent_9101kqfjg2z8ew5r3ad4fz6323yr',
      recordedAt: '2026-04-30',
    },
  },
  partner: {
    displayName: 'WorkforceAP Partner Concierge',
    audiences: ['partner'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_PARTNER_AGENT_ID',
    environmentOverridePolicy: anyValidAgentId,
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: 'agent_3701kqfjfxxjfm88pgh40h2ca4bs',
      failClosed: false,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: ['agent_3701kqfjfxxjfm88pgh40h2ca4bs'],
    historicalMigration: {
      sourceAgentId: 'agent_7601kntxhqx3e0mvznpwk9bqj5yw',
      migratedAgentId: 'agent_3701kqfjfxxjfm88pgh40h2ca4bs',
      recordedAt: '2026-04-30',
    },
  },
  wioa_prequal: {
    displayName: 'WorkforceAP WIOA Pre-Qualification Guide',
    audiences: ['member', 'anonymous'],
    exposure: 'public',
    environmentKey: 'ELEVENLABS_WIOA_PREQUAL_AGENT_ID',
    environmentOverridePolicy: anyValidAgentId,
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: 'agent_7801kqfjg0qwfy68btrqh6jg87kf',
      failClosed: false,
    },
    allowedMemberTools: [],
    checkedInPatchAgentIds: ['agent_7801kqfjg0qwfy68btrqh6jg87kf'],
    historicalMigration: {
      sourceAgentId: 'agent_6801knv07nb2ftj9p54nm6xem0xj',
      migratedAgentId: 'agent_7801kqfjg0qwfy68btrqh6jg87kf',
      recordedAt: '2026-04-30',
    },
  },
  career_business: {
    displayName: 'Lilley - WorkforceAP Student Career Coach (legacy entry point)',
    audiences: ['member'],
    exposure: 'private',
    environmentKey: 'ELEVENLABS_CAREER_BUSINESS_AGENT_ID',
    environmentOverridePolicy: reviewedOnly(LILLEY_STUDENT_COACH_AGENT_ID),
    resolution: {
      mode: 'env-with-reviewed-fallback',
      reviewedFallbackAgentId: LILLEY_STUDENT_COACH_AGENT_ID,
      failClosed: false,
    },
    allowedMemberTools: MEMBER_AGENT_TOOL_NAMES,
    checkedInPatchAgentIds: [
      LILLEY_STUDENT_COACH_AGENT_ID,
      'agent_5701kqfjg48rf30a8a0gehze8war',
    ],
    historicalMigration: {
      sourceAgentId: 'agent_2801kmznvsemfmms06r0e02es1b9',
      migratedAgentId: 'agent_5701kqfjg48rf30a8a0gehze8war',
      recordedAt: '2026-04-30',
    },
  },
} as const satisfies Record<ElevenLabsAgentKey, ElevenLabsAgentRegistryEntry>;

export type ElevenLabsAgentResolutionFailureReason =
  | 'missing-required-environment'
  | 'invalid-environment-agent-id'
  | 'unreviewed-environment-agent-id';

export type ElevenLabsAgentResolution =
  | {
      readonly ok: true;
      readonly key: ElevenLabsAgentKey;
      readonly agentId: ElevenLabsAgentId;
      readonly source: 'environment' | 'reviewed-fallback';
      readonly environmentKey: ElevenLabsAgentEnvironmentKey;
      readonly ignoredEnvironmentReason?: Exclude<
        ElevenLabsAgentResolutionFailureReason,
        'missing-required-environment'
      >;
    }
  | {
      readonly ok: false;
      readonly key: ElevenLabsAgentKey;
      readonly environmentKey: ElevenLabsAgentEnvironmentKey;
      readonly reason: ElevenLabsAgentResolutionFailureReason;
    };

export type ElevenLabsAgentEnvironment = Partial<
  Record<ElevenLabsAgentEnvironmentKey, string | undefined>
>;

/** ElevenLabs agent IDs currently use `agent_` plus 28 lowercase letters/digits. */
export function isElevenLabsAgentId(value: string): value is ElevenLabsAgentId {
  return /^agent_[a-z0-9]{28}$/.test(value);
}

function fallbackResolution(
  key: ElevenLabsAgentKey,
  entry: ElevenLabsAgentRegistryEntry,
  ignoredEnvironmentReason?: Exclude<
    ElevenLabsAgentResolutionFailureReason,
    'missing-required-environment'
  >,
): ElevenLabsAgentResolution {
  if (entry.resolution.mode === 'env-only') {
    return {
      ok: false,
      key,
      environmentKey: entry.environmentKey,
      reason: ignoredEnvironmentReason ?? 'missing-required-environment',
    };
  }

  return {
    ok: true,
    key,
    agentId: entry.resolution.reviewedFallbackAgentId,
    source: 'reviewed-fallback',
    environmentKey: entry.environmentKey,
    ...(ignoredEnvironmentReason ? { ignoredEnvironmentReason } : {}),
  };
}

/**
 * Resolve an agent without silently routing an env-only role to another agent.
 * Invalid or unreviewed overrides fall back only when a reviewed fallback exists.
 */
export function resolveElevenLabsAgent(
  key: ElevenLabsAgentKey,
  environment: ElevenLabsAgentEnvironment = process.env as ElevenLabsAgentEnvironment,
): ElevenLabsAgentResolution {
  const entry = ELEVENLABS_AGENT_REGISTRY[key];
  const configured = environment[entry.environmentKey]?.trim();

  if (!configured) {
    return fallbackResolution(key, entry);
  }

  if (!isElevenLabsAgentId(configured)) {
    return fallbackResolution(key, entry, 'invalid-environment-agent-id');
  }

  // The nonprofit agent once used for staff now runs the governed student
  // prompt. Never send caseload or staff context to that repurposed agent.
  if (key === 'counselor_staff' && configured === LILLEY_STUDENT_COACH_AGENT_ID) {
    return fallbackResolution(key, entry, 'unreviewed-environment-agent-id');
  }

  if (
    entry.environmentOverridePolicy.kind === 'reviewed-agent-ids' &&
    !entry.environmentOverridePolicy.agentIds.includes(configured)
  ) {
    return fallbackResolution(key, entry, 'unreviewed-environment-agent-id');
  }

  return {
    ok: true,
    key,
    agentId: configured,
    source: 'environment',
    environmentKey: entry.environmentKey,
  };
}

/** Compatibility helper for existing callers that expect `string | undefined`. */
export function getElevenLabsAgentIdFromRegistry(
  key: ElevenLabsAgentKey,
  environment: ElevenLabsAgentEnvironment = process.env as ElevenLabsAgentEnvironment,
): ElevenLabsAgentId | undefined {
  const result = resolveElevenLabsAgent(key, environment);
  return result.ok ? result.agentId : undefined;
}

export function environmentKeyForElevenLabsAgent(
  key: ElevenLabsAgentKey,
): ElevenLabsAgentEnvironmentKey {
  return ELEVENLABS_AGENT_REGISTRY[key].environmentKey;
}
