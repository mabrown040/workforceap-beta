const STORAGE_PREFIX = 'wa_exp_';
const ANON_ID_KEY = 'wa_anon_id';
const SESSION_ID_KEY = 'wa_session_id';

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getStableAnonymousId() {
  try {
    const existing = localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(ANON_ID_KEY, generated);
    return generated;
  } catch {
    return 'anon_fallback';
  }
}

function getStableSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_ID_KEY, generated);
    return generated;
  } catch {
    return 'session_fallback';
  }
}

export function getExperimentVariant(
  experiment: string,
  variants: readonly string[],
  scope: 'visitor' | 'session' = 'visitor'
) {
  if (typeof window === 'undefined' || variants.length === 0) {
    return variants[0] ?? 'control';
  }

  const key = `${STORAGE_PREFIX}${experiment}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored && variants.includes(stored)) return stored;
    const anonId = getStableAnonymousId();
    const scopeSeed = scope === 'session' ? getStableSessionId() : 'visitor';
    const chosen = variants[hashSeed(`${experiment}:${anonId}:${scopeSeed}`) % variants.length];
    localStorage.setItem(key, chosen);
    return chosen;
  } catch {
    return variants[0];
  }
}
