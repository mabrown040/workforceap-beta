import { sanitizeRedirectPath } from './safeRedirectPath';

/**
 * Normalizes the final destination after authentication.
 * Prevents redirecting a successfully authenticated user back to /login.
 */
export function normalizePostLoginRedirect(
  raw: string | null | undefined,
  fallback = '/dashboard'
): string {
  const safe = sanitizeRedirectPath(raw, fallback);

  try {
    const parsed = new URL(safe, 'https://internal.invalid');
    if (parsed.pathname === '/login') return fallback;
    return safe;
  } catch {
    return fallback;
  }
}
