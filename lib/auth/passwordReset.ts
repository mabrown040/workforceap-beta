import { createClient } from '@supabase/supabase-js';
import { getOrganizationBranding } from '@/lib/tenant/organizationBranding';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { reenableAuthUserAfterRestore } from '@/lib/admin/authUserLifecycle';
import { prisma } from '@/lib/db/prisma';
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
 * Heal the "user in Prisma, not in Supabase Auth" split from a reset request.
 *
 * Ops (9/5/26): an admin's reset link never arrived and the login answered
 * "Incorrect email or password" for every password. Before 9/2 the admin
 * soft-delete hard-deleted the Supabase auth user (see
 * `disableAuthUserForSoftDelete`), and `docs/auth-troubleshooting.md` lists
 * seeds/manual inserts as another source of Prisma-only accounts. GoTrue then
 * reports "user not found" to `generateLink`, which this module used to treat
 * as an unknown address and silently skip — so the member could neither sign
 * in nor recover.
 *
 * When an active `users` row exists for the address, re-create the auth user
 * under the SAME id (User.id is the auth id everywhere) with a confirmed email
 * and no password, exactly as admin restore does, so the reset link that
 * follows lets the member set a password and sign in. Returns true when the
 * auth user now exists.
 */
async function recreateAuthUserFromPrismaRow(
  admin: ReturnType<typeof getSupabaseAdmin>,
  normalizedEmail: string,
): Promise<boolean> {
  let row: { id: string; email: string; fullName: string | null; phone: string | null } | null = null;
  try {
    row = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' }, deletedAt: null },
      select: { id: true, email: true, fullName: true, phone: true },
    });
  } catch (err) {
    logger.warn('passwordReset: could not look up users row for auth self-heal', {
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
  if (!row) return false;

  const result = await reenableAuthUserAfterRestore(admin, {
    id: row.id,
    email: normalizedEmail,
    fullName: row.fullName,
    phone: row.phone,
  });
  if (!result.ok) {
    logger.error('passwordReset: auth user missing for an active users row and could not be re-created', {
      userId: row.id,
      reason: result.message,
    });
    return false;
  }
  logger.warn('passwordReset: re-created missing Supabase auth user for an active account', {
    userId: row.id,
    action: result.action,
  });
  return true;
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
    const mintRecoveryLink = () =>
      admin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: { redirectTo: resetPageUrl },
      });

    let { data, error } = await mintRecoveryLink();

    if (error && isUserNotFound(error.message)) {
      // No auth user — but is there an app account? If so, bring the login
      // back under the same id and mint the link again.
      if (await recreateAuthUserFromPrismaRow(admin, normalizedEmail)) {
        ({ data, error } = await mintRecoveryLink());
      }
    }

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
