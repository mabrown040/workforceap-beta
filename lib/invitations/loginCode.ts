/**
 * Human-readable "login code" for an invitation.
 *
 * Ops (9/2/26): Community Ambassadors (and any other invitee) should be able
 * to sign up with a short code they can be told over the phone or handed on
 * paper, not only by clicking a 64-character link. The code is the first 8
 * hex characters of the invitation token, shown as XXXX-XXXX. Redeeming it
 * also requires the invitee's email address, so the pair (email + code) is
 * what unlocks the invitation — the code alone is not enough.
 */

export const LOGIN_CODE_LENGTH = 8;

export function loginCodeFromToken(token: string): string {
  const head = token.trim().slice(0, LOGIN_CODE_LENGTH).toUpperCase();
  return `${head.slice(0, 4)}-${head.slice(4)}`;
}

/** Lowercase hex prefix that matches how tokens are stored; null when malformed. */
export function normalizeLoginCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const hex = input.replace(/[^0-9a-fA-F]/g, '').toLowerCase();
  if (hex.length !== LOGIN_CODE_LENGTH) return null;
  return hex;
}
