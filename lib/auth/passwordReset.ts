import { createClient } from '@supabase/supabase-js';
import { getOrganizationBranding } from '@/lib/tenant/organizationBranding';

/**
 * Track E (Sprint E.1 PR 2) — when `orgId` is supplied, the reset link's
 * `redirectTo` origin is the org's `customDomain` (or default), so AAUL
 * users who click "reset password" land back on AAUL's hostname instead
 * of `www.workforceap.org`.
 *
 * Note: Supabase Auth itself owns the email body and "from" header — those
 * are not branded by this codebase. White-label of the reset email body
 * requires either a custom Supabase email template (configured in the
 * dashboard, can interpolate `{{ .SiteURL }}`) or replacing the Supabase
 * call entirely with our own Resend send. Out of scope for this PR.
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectPath = '/reset-password',
  options: { orgId?: string | null } = {},
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Password reset is temporarily unavailable.');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const branding = await getOrganizationBranding(options.orgId);
  const baseUrl = branding.domain;

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}${redirectPath}`,
  });
}
