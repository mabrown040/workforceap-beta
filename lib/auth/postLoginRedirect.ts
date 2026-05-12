import { sanitizeRedirectPath } from './safeRedirectPath';

/**
 * If the user asked for the member home (`/dashboard` only, not nested routes),
 * send staff to their portal. Mirrors existing admin behavior; adds counselors → /counselor.
 */
export function resolveRoleAwarePostLoginRedirect(
  redirectTo: string,
  profileRole: string | null | undefined
): string {
  if (profileRole === 'super_admin') return '/admin';

  let pathname: string;
  try {
    pathname = new URL(redirectTo, 'https://internal.invalid').pathname;
  } catch {
    return redirectTo;
  }
  if (pathname !== '/dashboard') return redirectTo;

  if (profileRole === 'admin') return '/admin';
  if (profileRole === 'counselor') return '/counselor';
  return redirectTo;
}

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
