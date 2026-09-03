import { createClient } from '@supabase/supabase-js';
import { getOrganizationBranding } from '@/lib/tenant/organizationBranding';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getResend } from '@/lib/email';
import { sendBrandedEmail } from '@/lib/email/send';
import { brandedEmailLayout } from '@/lib/email/template';
import { logger } from '@/lib/observability/logger';

export type PasswordResetSendResult = {
  error: { message: string } | null;
  /** Which mailer carried the email; `skipped` when no account matched. */
  via: 'resend' | 'supabase' | 'skipped';
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isUserNotFound(message: string): boolean {
  return /user.*not.*found|no user|not found/i.test(message);
}

/**
 * Send a password-reset email.
 *
 * Ops (9/2/26): the "Reset password" button was not delivering mail. The
 * previous implementation relied entirely on Supabase Auth's built-in mailer
 * (`resetPasswordForEmail`), which depends on the project's SMTP settings and
 * its redirect-URL allowlist — neither of which this codebase controls, and
 * both of which fail silently. We now mint the recovery token ourselves with
 * the service role (`auth.admin.generateLink`) and deliver it through Resend,
 * the same provider every other WorkforceAP email uses. The link carries the
 * `token_hash` that `/reset-password` already knows how to verify, so it does
 * not depend on the Supabase redirect allowlist at all.
 *
 * Track E (Sprint E.1 PR 2) — when `orgId` is supplied, the link's origin is
 * the org's `customDomain` (or default), so AAUL users land on AAUL's host.
 *
 * Falls back to the Supabase mailer when Resend or the service role key is not
 * configured (local dev), so the flow never regresses below the old behavior.
 */
export async function sendPasswordResetEmail(
  email: string,
  redirectPath = '/reset-password',
  options: { orgId?: string | null } = {},
): Promise<PasswordResetSendResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Password reset is temporarily unavailable.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const branding = await getOrganizationBranding(options.orgId);
  const baseUrl = branding.domain;
  const resetPageUrl = `${baseUrl}${redirectPath}`;

  const resend = getResend();
  const canMintOwnLink = !!resend && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (canMintOwnLink) {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo: resetPageUrl },
    });

    if (error) {
      // Unknown address: report as skipped so callers keep their uniform
      // "if an account exists" response without revealing anything.
      if (isUserNotFound(error.message)) {
        return { error: { message: error.message }, via: 'skipped' };
      }
      return { error: { message: error.message }, via: 'resend' };
    }

    const hashedToken = data?.properties?.hashed_token;
    const resetLink = hashedToken
      ? `${resetPageUrl}?token_hash=${encodeURIComponent(hashedToken)}&type=recovery`
      : data?.properties?.action_link;
    if (!resetLink) {
      return { error: { message: 'Supabase did not return a recovery link.' }, via: 'resend' };
    }

    const from = process.env.EMAIL_FROM || `${branding.name} <hello@workforceap.org>`;
    const html = brandedEmailLayout({
      title: 'Reset your password',
      bodyHtml: `
        <p>We received a request to reset the password for <strong>${escapeHtml(normalizedEmail)}</strong>.</p>
        <p>Click the button below to choose a new password. The link works once and expires in about an hour.</p>
        <p style="font-size:13px;color:#6b6b6b;">If you did not ask for this, you can ignore this email — your password will not change. Questions? Email <a href="mailto:${escapeHtml(branding.supportEmail)}">${escapeHtml(branding.supportEmail)}</a>.</p>
      `,
      ctaText: 'Reset password',
      ctaUrl: resetLink,
      branding,
    });

    try {
      await sendBrandedEmail(resend, {
        from,
        to: normalizedEmail,
        subject: `Reset your ${branding.name} password`,
        html,
        replyTo: branding.supportEmail,
      });
      return { error: null, via: 'resend' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password reset email could not be sent.';
      logger.error('passwordReset: Resend delivery failed', { err: message });
      return { error: { message }, via: 'resend' };
    }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: resetPageUrl,
  });
  return { error: error ? { message: error.message } : null, via: 'supabase' };
}
