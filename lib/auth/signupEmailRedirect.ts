/**
 * Confirmation-email redirect for `supabase.auth.signUp`.
 *
 * GoTrue rejects `emailRedirectTo` values that are not on the project's
 * redirect allow-list. Hosted demo/prod projects usually list the public
 * site and Vercel previews, not `http://localhost:3000`. Passing localhost
 * makes every local signup fail closed with a generic 400 before an auth
 * user is created. Omit the override on loopback so GoTrue uses the
 * project's configured Site URL instead.
 */
export function signupEmailRedirectTo(origin: string): string | undefined {
  let host: string;
  try {
    host = new URL(origin).hostname;
  } catch {
    return undefined;
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') {
    return undefined;
  }
  return `${origin.replace(/\/$/, '')}/auth/callback`;
}
