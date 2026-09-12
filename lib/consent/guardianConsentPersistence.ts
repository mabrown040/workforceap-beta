import { Prisma, type PrismaClient } from '@prisma/client';
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

    // Lock the exact validated row before checking the database wall clock.
    // PostgreSQL may evaluate an UPDATE predicate before it waits on an
    // unchanged locked row, so clock_timestamp() belongs in a second statement
    // that starts only after this lock has been acquired.
    const [locked] = await tx.$queryRaw<Array<{ consumedAt: Date | null }>>(Prisma.sql`
      SELECT consumed_at AS "consumedAt"
      FROM tokenized_link
      WHERE id = ${link.id}
        AND token = ${input.token}
        AND type = 'guardian_consent'
        AND subject_user_id = ${link.subjectUserId}
      FOR UPDATE
    `);
    if (!locked) {
      return { ok: false as const, reason: 'invalid' as const };
    }
    if (locked.consumedAt) {
      return { ok: false as const, reason: 'conflict' as const };
    }

    const [claim] = await tx.$queryRaw<Array<{ claimedAt: Date }>>(Prisma.sql`
      UPDATE tokenized_link
      SET consumed_at = clock_timestamp()
      WHERE id = ${link.id}
        AND token = ${input.token}
        AND type = 'guardian_consent'
        AND subject_user_id = ${link.subjectUserId}
        AND consumed_at IS NULL
        AND expires_at >= clock_timestamp()
      RETURNING consumed_at AS "claimedAt"
    `);
    if (!claim) {
      const [state] = await tx.$queryRaw<Array<{
        consumedAt: Date | null;
        expired: boolean;
      }>>(Prisma.sql`
        SELECT
          consumed_at AS "consumedAt",
          expires_at < clock_timestamp() AS expired
        FROM tokenized_link
        WHERE id = ${link.id}
          AND token = ${input.token}
          AND type = 'guardian_consent'
          AND subject_user_id = ${link.subjectUserId}
      `);
      if (state?.consumedAt) {
        return { ok: false as const, reason: 'conflict' as const };
      }
      if (state?.expired) {
        return { ok: false as const, reason: 'expired' as const };
      }
      return { ok: false as const, reason: 'conflict' as const };
    }

    const profileData = {
      isMinor: true,
      parentGuardianName: input.guardianName,
      parentGuardianEmail: input.guardianEmail,
      parentGuardianPhone: input.guardianPhone,
      parentalConsentGiven: true,
      parentalConsentDate: claim.claimedAt,
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
