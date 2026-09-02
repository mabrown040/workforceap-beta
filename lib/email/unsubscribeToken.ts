/**
 * Stateless HMAC tokens for one-click email unsubscribe (RFC 8058).
 *
 * Tokens are bound to the RECIPIENT EMAIL (not user id) so the send wrapper
 * can mint one for every outgoing message without callers threading user ids
 * through — the wrapper only ever knows `to`.
 *
 * Token format: base64url(email) + '.' + base64url(hmacSHA256(email, secret)).
 * No expiry — an unsubscribe link in an old email should keep working, and
 * the only action a token authorizes is turning notifications OFF for the
 * account matching its own email (never on, never anything else), so replay
 * is harmless.
 */
import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const s =
    process.env.UNSUBSCRIBE_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('No secret available for unsubscribe tokens');
  return s;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function sign(email: string): Buffer {
  return createHmac('sha256', secret()).update(normalize(email)).digest();
}

export function buildUnsubscribeToken(email: string): string {
  return `${Buffer.from(normalize(email)).toString('base64url')}.${sign(email).toString('base64url')}`;
}

/** Returns the normalized email when the token is authentic, otherwise null. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  try {
    const email = Buffer.from(token.slice(0, dot), 'base64url').toString();
    const mac = Buffer.from(token.slice(dot + 1), 'base64url');
    const expected = sign(email);
    if (mac.length !== expected.length || !timingSafeEqual(mac, expected)) return null;
    return normalize(email);
  } catch {
    return null;
  }
}

/** Remove characters that are illegal in an HTTP header value. */
export function stripHeaderUnsafe(value: string): string {
  return value.replace(/[\r\n\0]/g, '').trim();
}

/**
 * Absolute one-click unsubscribe URL for a recipient, for List-Unsubscribe.
 *
 * The base is env-derived and lands verbatim in an HTTP header, so it is
 * stripped of CR/LF/NUL and surrounding whitespace first. A single trailing
 * newline in NEXT_PUBLIC_SITE_URL (easy to paste into a hosting dashboard)
 * otherwise makes every single-recipient send throw
 * "Header keys and values cannot contain carriage return, line feed, or null
 * characters" — which took out nudges, weekly recaps and application
 * confirmations in production while multi-recipient admin mail kept working.
 */
export function buildUnsubscribeUrl(email: string): string {
  const configured = stripHeaderUnsafe(process.env.NEXT_PUBLIC_SITE_URL ?? '');
  const base = (configured || 'https://www.workforceap.org').replace(/\/$/, '');
  return `${base}/api/unsubscribe?token=${encodeURIComponent(buildUnsubscribeToken(email))}`;
}
