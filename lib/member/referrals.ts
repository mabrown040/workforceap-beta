/**
 * Member-to-member referral perks.
 *
 * Distinct from PartnerReferral (B2B / marketing source captured via `?ref=` on /apply).
 * Flow:
 *   1. A member mints a code (lazily) and shares /r/<code>.
 *   2. /r/<code> sets an httpOnly cookie on the visitor's browser.
 *   3. When that visitor becomes a member AND enrolls in a program, both sides earn
 *      points — once. Reward fires at enrollment, never at signup, so codes can't be
 *      farmed by signing up throwaway accounts.
 *
 * Idempotency / anti-farming guards:
 *   - One referral per referee, ever  → ReferralConversion.refereeUserId is @unique.
 *   - No self-referral                → referrer !== referee.
 *   - No double points                → awardPoints is keyed on the conversion id and
 *                                        backed by the points_transactions unique index.
 */
import { randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getLevelForPoints, POINT_VALUES } from '@/lib/member/pointsConfig';
import { computeNextStreak } from '@/lib/member/streaks';
import { withSystemGuc } from '@/lib/db/withRequestGuc';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
  normalizeReferralCode,
  referralRewardEligibility,
} from '@/lib/member/referralRules';

export {
  MEMBER_REFERRAL_COOKIE,
  REFERRAL_CODE_PATTERN,
  normalizeReferralCode,
  isValidReferralCode,
  referralRewardEligibility,
} from '@/lib/member/referralRules';

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/** Mint-or-return the caller's single shareable referral code. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.referralCode.findUnique({ where: { userId } });
        if (existing) return existing.code;
        const created = await tx.referralCode.create({ data: { userId, code: generateCode() } });
        return created.code;
      });
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        // Either another request minted this user's code first, or the random code
        // collided. If ours now exists, use it; otherwise retry with a fresh code.
        continue;
      }
      throw e;
    }
  }
  throw new Error('Could not mint a unique referral code after retries');
}

/** Resolve a referral code to its owning (referrer) userId, or null. */
export async function resolveReferralCode(rawCode: string | null | undefined): Promise<string | null> {
  const code = normalizeReferralCode(rawCode);
  if (!REFERRAL_CODE_PATTERN.test(code)) return null;
  const row = await prisma.$transaction(tx => tx.referralCode.findFirst({ where: { code, user: { deletedAt: null } } }));
  return row?.userId ?? null;
}

/** Count only conversions with both reward receipts; never expose referee data. */
export async function getRewardedReferralCount(userId: string): Promise<number> {
  // The second receipt belongs to the friend. Read only this caller's aggregate
  // in system context so forcing RLS cannot hide that receipt or leak its data.
  return withSystemGuc(() => prisma.$transaction(async tx => {
    const [row] = await tx.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::int AS count FROM referral_conversions c
      WHERE c.referrer_user_id = ${userId} AND c.status = 'rewarded'
        AND EXISTS (SELECT 1 FROM points_transactions p WHERE p.user_id = c.referrer_user_id
          AND p.entity_id = c.id AND p.event = 'referral_referrer_reward' AND p.points > 0)
        AND EXISTS (SELECT 1 FROM points_transactions p WHERE p.user_id = c.referee_user_id
          AND p.entity_id = c.id AND p.event = 'referral_referee_reward' AND p.points > 0)
    `);
    return row?.count ?? 0;
  }));
}

/**
 * Reward a referral when the referee enrolls. Safe to call on every enrollment:
 * the guards, serializable transaction and unique receipts prevent double awards.
 * Returns true when at least one missing award was granted this call. Historical
 * conversions retain their original attribution; existing receipts are never
 * guessed to be missing from the points cache or incremented a second time.
 *
 * Runs in the system GUC context: the work is inherently cross-user (it reads the
 * referrer's code row and writes the referrer's points), which a single member's
 * RLS context can't authorize once row-level security is forced.
 */
export async function rewardReferralOnEnrollment(
  refereeUserId: string,
  rawCode: string | null | undefined
): Promise<boolean> {
  const code = normalizeReferralCode(rawCode);
  if (!REFERRAL_CODE_PATTERN.test(code)) return false;

  return withSystemGuc(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await prisma.$transaction(async tx => {
          const owner = await tx.referralCode.findFirst({ where: { code, user: { deletedAt: null } } });
          const referrerUserId = owner?.userId ?? null;
          if (!referralRewardEligibility({ referrerUserId, refereeUserId, alreadyReferred: false }).ok || !referrerUserId) return false;
          const referee = await tx.user.findFirst({ where: { id: refereeUserId, deletedAt: null }, select: { id: true } });
          if (!referee) return false;
          const existing = await tx.referralConversion.findUnique({ where: { refereeUserId } });
          if (existing && (existing.referrerUserId !== referrerUserId || existing.code !== code || !['pending', 'rewarded'].includes(existing.status))) return false;
          const conversion = existing ?? await tx.referralConversion.create({ data: { referrerUserId, refereeUserId, code, status: 'pending' } });
          let awarded = false;
          // Consistent row ordering limits deadlocks when two members refer each other.
          const recipients = [
            { userId: referrerUserId, event: 'referral_referrer_reward' },
            { userId: refereeUserId, event: 'referral_referee_reward' },
          ].sort((a, b) => a.userId.localeCompare(b.userId));
          for (const { userId, event } of recipients) {
            const points = POINT_VALUES[event];
            const receipt = await tx.pointsTransaction.createMany({ data: [{ userId, event, entityId: conversion.id, points }], skipDuplicates: true });
            if (receipt.count === 0) continue;
            const balance = await tx.memberPoints.upsert({
              where: { userId },
              create: { userId, totalPoints: points, level: getLevelForPoints(points).name },
              update: { totalPoints: { increment: points } },
            });
            await tx.memberPoints.update({ where: { userId }, data: {
              level: getLevelForPoints(balance.totalPoints).name,
              ...computeNextStreak(balance),
            } });
            awarded = true;
          }
          if (awarded || conversion.status !== 'rewarded') {
            await tx.referralConversion.update({ where: { id: conversion.id }, data: { status: 'rewarded', rewardedAt: conversion.rewardedAt ?? new Date() } });
          }
          return awarded;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        const retryable = ['P2002', 'P2034'].includes((error as { code?: string }).code ?? '');
        if (!retryable || attempt === 2) throw error;
      }
    }
    return false;
  });
}
