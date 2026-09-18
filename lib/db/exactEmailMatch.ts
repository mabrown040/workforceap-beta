/**
 * Exact-match guard for Prisma's case-insensitive email lookups.
 *
 * On PostgreSQL, Prisma compiles `{ equals: value, mode: 'insensitive' }` to
 * `ILIKE $1` with the caller-supplied string used as the PATTERN. `%` and `_`
 * are therefore wildcards, not literals, and such a filter can match a row
 * that is not the requested address at all — `m_johnson@x.org` matches
 * `mrjohnson@x.org`, and `%@x.org` matches every address on the domain.
 *
 * Wherever the address comes from an untrusted caller — or from Coursera /
 * xAPI, which we then persist as a permanent identity link — matching is not
 * proof of identity. Select the candidates, then keep only a genuine
 * case-insensitive equality. Selecting the exact row rather than rejecting the
 * whole batch also preserves correct behaviour for legitimate addresses that
 * contain `_`, which would otherwise collide with a same-shaped address.
 *
 * Callers must include `email` in their `select` for this to work.
 */

/** Trim + lowercase, the normalization used for email comparison everywhere. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Pick the one candidate whose email genuinely equals `email`, ignoring case.
 * Returns null when the ILIKE pattern matched only unrelated rows.
 */
export function pickExactEmailMatch<T extends { email: string | null }>(
  candidates: readonly T[],
  email: string,
): T | null {
  const normalized = normalizeEmail(email);
  return candidates.find((c) => c.email != null && normalizeEmail(c.email) === normalized) ?? null;
}

/**
 * Bound on how many ILIKE candidates to pull back before the exact filter.
 * A literal address matches at most one row; anything more means the caller
 * supplied a pattern, and we only need enough rows to prove that.
 */
export const EXACT_EMAIL_CANDIDATE_LIMIT = 25;
