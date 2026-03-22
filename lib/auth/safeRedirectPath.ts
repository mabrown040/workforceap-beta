/**
 * Validates a post-login redirect as a same-origin relative path only.
 * Blocks protocol-relative URLs (//evil.com), backslashes, and embedded schemes.
 */
export function sanitizeRedirectPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (raw == null || typeof raw !== 'string') return fallback;
  const s = raw.trim();
  if (!s.startsWith('/') || s.startsWith('//')) return fallback;
  if (s.includes('\\') || s.includes('\0') || s.includes('\r') || s.includes('\n')) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return fallback;
  try {
    const u = new URL(s, 'https://internal.invalid');
    if (u.origin !== 'https://internal.invalid') return fallback;
    const out = `${u.pathname}${u.search}${u.hash}`;
    if (!out.startsWith('/') || out.startsWith('//')) return fallback;
    return out || fallback;
  } catch {
    return fallback;
  }
}
