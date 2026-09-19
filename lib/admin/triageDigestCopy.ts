/**
 * Plain-language row copy for the admin triage digest (`lib/admin/triageDigest.ts`).
 * Kept free of Prisma/server-only imports so it can be unit-tested directly.
 */

/**
 * "Stalled" bucket action line. `daysInactive` is null when neither a recent
 * MemberEvent nor an enrollment date exists — the digest only looks 30 days
 * back, so the honest claim is "no activity in 30+ days", not a made-up count.
 */
export function stalledCheckInAction(name: string, daysInactive: number | null): string {
  if (daysInactive == null) return `Check in with ${name} — no activity in 30+ days`;
  return `Check in with ${name} — stalled ${daysInactive} ${daysInactive === 1 ? 'day' : 'days'}`;
}
