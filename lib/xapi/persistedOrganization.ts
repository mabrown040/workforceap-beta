/**
 * Persisted xAPI rows must carry a real tenant before they can be replayed.
 * Sentinel values are deliberately not treated as tenant scope: resolving
 * them requires the guarded reconciliation path, not a fresh email lookup.
 */
export function normalizePersistedXapiOrganizationId(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() || '';
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  if (lower === 'unknown' || lower.startsWith('unresolved-')) return null;

  return normalized;
}
