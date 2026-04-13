/**
 * Shared cookie options for Supabase SSR clients (middleware + server).
 * `secure` in production prevents session cookies from being sent over plain HTTP.
 *
 * When `sessionOnly` is true, `maxAge` is omitted so the browser discards the
 * auth cookie when the tab/window is closed — honouring "don't remember me".
 */
export const SESSION_ONLY_COOKIE = 'wa_session_only';
export const SESSION_ONLY_MAX_AGE = 60 * 60 * 24 * 7; // 7 days (matches auth session)

export function getSupabaseCookieOptions(sessionOnly = false) {
  return {
    path: '/' as const,
    ...(sessionOnly ? {} : { maxAge: SESSION_ONLY_MAX_AGE }),
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}
