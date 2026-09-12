import type { PrismaClient } from '@prisma/client';
import { interactiveTransactionsGuaranteed } from '@/lib/db/transactionPolicy';

type TransactionRoot = Pick<PrismaClient, '$transaction'>;

export type GuardianConsentInput = {
  token: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string | null;
  now?: Date;
};

export type GuardianConsentOutcome =
  | { ok: true; subjectId: string; linkId: string; orgId: string | null }
  | { ok: false; reason: 'invalid' | 'expired' | 'consumed' | 'conflict' };

export async function persistGuardianConsent(
  client: TransactionRoot,
  input: GuardianConsentInput,
): Promise<GuardianConsentOutcome> {
  if (!interactiveTransactionsGuaranteed()) {
    throw new Error('GUARDIAN_CONSENT_TRANSACTION_UNAVAILABLE');
  }

  return client.$transaction(async (tx) => {
    const link = await tx.tokenizedLink.findUnique({
      where: { token: input.token },
      select: {
        id: true,
        type: true,
        subjectUserId: true,
        orgId: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    if (!link || link.type !== 'guardian_consent' || !link.subjectUserId) {
      return { ok: false as const, reason: 'invalid' as const };
    }
    if (link.consumedAt) {
      return { ok: false as const, reason: 'consumed' as const };
    }

    const now = input.now ?? new Date();
    if (link.expiresAt.getTime() < now.getTime()) {
      return { ok: false as const, reason: 'expired' as const };
    }

    // The guarded update is the concurrency winner. Keep expiry in this claim,
    // not only in the earlier read, so a token cannot expire in the gap.
    const consumed = await tx.tokenizedLink.updateMany({
      where: {
        id: link.id,
        type: 'guardian_consent',
        consumedAt: null,
        expiresAt: { gte: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) {
      return { ok: false as const, reason: 'conflict' as const };
    }

    const profileData = {
      isMinor: true,
      parentGuardianName: input.guardianName,
      parentGuardianEmail: input.guardianEmail,
      parentGuardianPhone: input.guardianPhone,
      parentalConsentGiven: true,
      parentalConsentDate: now,
    };
    await tx.profile.upsert({
      where: { userId: link.subjectUserId },
      create: { userId: link.subjectUserId, ...profileData },
      update: profileData,
      select: { userId: true },
    });

    return {
      ok: true as const,
      subjectId: link.subjectUserId,
      linkId: link.id,
      orgId: link.orgId,
    };
  });
}
