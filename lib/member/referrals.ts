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
import { prisma } from '@/lib/db/prisma';
import { awardPoints } from '@/lib/member/points';
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
  const existing = await prisma.referralCode.findUnique({ where: { userId } });
  if (existing) return existing.code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      const created = await prisma.referralCode.create({ data: { userId, code } });
      return created.code;
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        // Either another request minted this user's code first, or the random code
        // collided. If ours now exists, use it; otherwise retry with a fresh code.
        const mine = await prisma.referralCode.findUnique({ where: { userId } });
        if (mine) return mine.code;
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
  const row = await prisma.referralCode.findUnique({ where: { code } });
  return row?.userId ?? null;
}

/**
 * Reward a referral when the referee enrolls. Safe to call on every enrollment:
 * the guards + unique constraints make it idempotent and non-throwing on contention.
 * Returns true only when a fresh reward was granted this call.
 */
export async function rewardReferralOnEnrollment(
  refereeUserId: string,
  rawCode: string | null | undefined
): Promise<boolean> {
  const code = normalizeReferralCode(rawCode);
  if (!REFERRAL_CODE_PATTERN.test(code)) return false;

  const referrerUserId = await resolveReferralCode(code);
  const alreadyReferred = Boolean(
    await prisma.referralConversion.findUnique({ where: { refereeUserId } })
  );

  const { ok } = referralRewardEligibility({ referrerUserId, refereeUserId, alreadyReferred });
  if (!ok || !referrerUserId) return false;

  let conversionId: string;
  try {
    const conversion = await prisma.referralConversion.create({
      data: { referrerUserId, refereeUserId, code, status: 'rewarded', rewardedAt: new Date() },
    });
    conversionId = conversion.id;
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') return false; // raced — referee already referred
    throw e;
  }

  // Both sides, each keyed on the conversion id so the points unique index dedupes.
  await awardPoints(referrerUserId, 'referral_referrer_reward', conversionId);
  await awardPoints(refereeUserId, 'referral_referee_reward', conversionId);
  return true;
}
