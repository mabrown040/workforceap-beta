/**
 * Shared cookie options for Supabase SSR clients (middleware + server).
 * `secure` in production prevents session cookies from being sent over plain HTTP.
 */
export function getSupabaseCookieOptions() {
  return {
    path: '/' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}
