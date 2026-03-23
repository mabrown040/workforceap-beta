/**
 * Safe testing for employer match-suggestion email without hitting real inboxes.
 *
 * ADMIN_MATCH_SUGGESTIONS_TEST_EMAIL — if set, Resend "to" uses this address (employer email stays in audit metadata).
 * ADMIN_MATCH_SUGGESTIONS_DRY_RUN — if "1" or "true", skip Resend; returns { dryRun: true } and records audit.
 */

export function getMatchSuggestionsTestRecipient(): string | null {
  const v = process.env.ADMIN_MATCH_SUGGESTIONS_TEST_EMAIL?.trim();
  return v && v.length > 0 ? v : null;
}

export function isMatchSuggestionsDryRun(): boolean {
  const v = process.env.ADMIN_MATCH_SUGGESTIONS_DRY_RUN?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
