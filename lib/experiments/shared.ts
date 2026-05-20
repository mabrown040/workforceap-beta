/** Shared experiment types and client-safe assignment (no node:crypto). */

export type Variant = 'control' | 'variant_a' | 'variant_b';

export type ExperimentDefinition<V extends string = Variant> = {
  name: string;
  variants: readonly V[];
};

export type ExperimentSubject = {
  userId?: string | null;
  sessionId?: string | null;
};

export type ExperimentOverride = {
  exp?: string | null;
  signature?: string | null;
  allowUnsigned?: boolean;
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash | 0);
}

const ANON_LS_KEY = 'wa_anon_id';
const ANON_SS_KEY = 'wa_session_id';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function getClientAnonId(): string | null {
  if (!isBrowser()) return null;
  try {
    const existing = window.localStorage.getItem(ANON_LS_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(ANON_LS_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

function getClientSessionId(): string | null {
  if (!isBrowser()) return null;
  try {
    const existing = window.sessionStorage.getItem(ANON_SS_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(ANON_SS_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

function resolveSubjectSeed(subject?: ExperimentSubject): string | null {
  if (subject?.userId) return `u:${subject.userId}`;
  if (subject?.sessionId) return `s:${subject.sessionId}`;
  const clientAnon = getClientAnonId() ?? getClientSessionId();
  if (clientAnon) return `c:${clientAnon}`;
  return null;
}

function parseOverride(exp: string): { name: string; variant: string } | null {
  const idx = exp.indexOf(':');
  if (idx < 1 || idx === exp.length - 1) return null;
  return { name: exp.slice(0, idx), variant: exp.slice(idx + 1) };
}

/**
 * Client-safe variant assignment. Honors unsigned `_exp` overrides in non-production;
 * signed overrides are ignored in the browser (use the server async API instead).
 */
export function getExperimentVariantClient<V extends string = Variant>(
  definition: ExperimentDefinition<V>,
  subject?: ExperimentSubject,
  override?: ExperimentOverride,
): V {
  const variants = definition.variants;
  if (variants.length === 0) {
    return 'control' as V;
  }
  const fallback = variants[0];

  if (override?.exp) {
    const parsed = parseOverride(override.exp);
    if (parsed && parsed.name === definition.name) {
      const matchesKnownVariant = (variants as readonly string[]).includes(parsed.variant);
      if (matchesKnownVariant) {
        const allowUnsigned =
          override.allowUnsigned ?? process.env.NODE_ENV !== 'production';
        if (allowUnsigned && !override.signature) {
          return parsed.variant as V;
        }
      }
    }
  }

  const seed = resolveSubjectSeed(subject);
  if (!seed) return fallback;
  const idx = hashSeed(`${definition.name}::${seed}`) % variants.length;
  return variants[idx];
}

export function readExperimentOverrideFromSearch(
  search:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | string
    | null
    | undefined,
): ExperimentOverride {
  if (!search) return {};
  if (typeof search === 'string') {
    return readExperimentOverrideFromSearch(new URLSearchParams(search));
  }
  if (search instanceof URLSearchParams) {
    return {
      exp: search.get('_exp') ?? undefined,
      signature: search.get('_exp_signature') ?? undefined,
    };
  }
  const pick = (key: string) => {
    const value = search[key];
    if (Array.isArray(value)) return value[0];
    return value;
  };
  return {
    exp: pick('_exp') ?? undefined,
    signature: pick('_exp_signature') ?? undefined,
  };
}

export const EXPERIMENTS = {
  EMPLOYERS_HERO_CTA: {
    name: 'employers_hero_cta',
    variants: ['control', 'variant_a'] as const,
  },
} as const satisfies Record<string, ExperimentDefinition>;
