/**
 * Heuristic for test / smoke-test traffic that pollutes the unmatched
 * learners list. The May 2026 admin/coursera snapshot showed 81 unresolved
 * xAPI events for `test-smoke@workforceap.org`, plus rows for `force-test-…`
 * and `test@workforceap.org` — none of which represent real learners.
 *
 * Patterns:
 *   - Emails containing the substring "test" (covers test-smoke, qa-test,
 *     etc. — false positives are rare for real applicant emails)
 *   - Emails / actors starting with "force-" (the platform's automated
 *     load-test prefix)
 *   - Emails starting with "noreply" / "no-reply"
 *   - Emails ending with "@example.com" / "@example.org" (RFC 2606 reserved)
 *
 * **Keep in sync with the SQL fragments in `progressQueries.ts`:**
 *   - `TEST_ACCOUNT_EXCLUSION_HAVING`
 *   - `TEST_ACCOUNT_EXCLUSION_WHERE`
 *
 * This file is intentionally separated from `progressQueries.ts` so it can
 * be unit-tested without dragging in the `server-only` import chain.
 *
 * Tracked as MATCHING-DEBT-001 in docs/COURSERA-IDENTITY-MATCHING.md.
 */
export function isLikelyTestAccount(externalKey: string | null | undefined): boolean {
  if (!externalKey) return false;
  const lower = externalKey.trim().toLowerCase();
  if (!lower) return false;

  if (lower.startsWith('force-')) return true;
  if (lower.startsWith('noreply') || lower.startsWith('no-reply')) return true;
  if (lower.endsWith('@example.com') || lower.endsWith('@example.org')) return true;

  // Substring 'test' covers smoke / e2e / qa-test patterns. Could false-
  // positive on a name like "kontestina" but real applicant emails almost
  // never contain "test" as a substring at the org level.
  if (lower.includes('test')) return true;

  return false;
}
