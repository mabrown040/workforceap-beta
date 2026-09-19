/**
 * Plain-language row copy for the admin triage digest (`lib/admin/triageDigest.ts`).
 * Kept free of Prisma/server-only imports so it can be unit-tested directly.
 */

/**
 * Card accents for the three triage buckets. Tokens, not hex: the action line
 * (`m.action`, 0.82rem/600) is painted in this colour over the white card, so
 * each value must clear 4.5:1 there. `#3b82f6` (new applicants) measured
 * 3.25:1; `--wa-info` is #2b7bb9 in light mode, 4.53:1 on #ffffff.
 */
export const TRIAGE_BUCKET_ACCENTS = Object.freeze({
  'new-applicants': 'var(--wa-info)',
  'at-risk': '#dc2626',
  stalled: 'var(--wa-gold-dark)',
} as const);

/**
 * "Stalled" bucket action line. `daysInactive` is null when neither a recent
 * MemberEvent nor an enrollment date exists — the digest only looks 30 days
 * back, so the honest claim is "no activity in 30+ days", not a made-up count.
 */
export function stalledCheckInAction(name: string, daysInactive: number | null): string {
  if (daysInactive == null) return `Check in with ${name} — no activity in 30+ days`;
  return `Check in with ${name} — stalled ${daysInactive} ${daysInactive === 1 ? 'day' : 'days'}`;
}
