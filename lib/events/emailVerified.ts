import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { trackEmailVerified as logEmailVerifiedAnalytics } from '@/lib/analytics/track';
import { trackEvent } from '@/lib/events/track';

export type EmailVerifiedPayload = {
  user_id: string;
  email_domain: string | null;
  ts: string;
  source: 'callback';
};

/** Domain portion only — never persist full email in analytics metadata. */
export function emailDomainFromAddress(email: string | undefined | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 0 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  return domain || null;
}

/**
 * Server-side email_verified (auth callback). Idempotent per user; never blocks auth.
 */
export async function emitEmailVerifiedFromCallback(
  userId: string,
  email: string | undefined | null,
): Promise<void> {
  try {
    const alreadyEmitted = await prisma.memberEvent.findFirst({
      where: { userId, eventName: 'email_verified' },
      select: { id: true },
    });
    if (alreadyEmitted) return;

    const payload: EmailVerifiedPayload = {
      user_id: userId,
      email_domain: emailDomainFromAddress(email),
      ts: new Date().toISOString(),
      source: 'callback',
    };

    logEmailVerifiedAnalytics(payload);

    await trackEvent({
      userId,
      eventName: 'email_verified',
      sourcePage: '/auth/callback',
      metadata: payload,
    });
  } catch (err) {
    console.error('[emailVerified] emit failed', err);
  }
}
