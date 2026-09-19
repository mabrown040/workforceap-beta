import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { assignMemberCounselor } from '@/lib/counselor/assignment';

export const WAP_STAFF_COUNSELOR_AFFILIATION = 'wap_staff' as const;

export type EnsureSelfServeCounselorResult = {
  assigned: boolean;
  counselorUserId: string | null;
  reason: 'assigned' | 'already_assigned' | 'no_counselors' | 'member_unavailable';
};

/**
 * Least-loaded active WorkforceAP staff counselor in the org.
 * Ties go to the oldest counselor row so the pick is deterministic.
 * Community ambassadors, partner, and independent counselors stay out of
 * the self-serve pool.
 */
export async function pickLeastLoadedWapCounselor(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<{ counselorId: string; userId: string } | null> {
  const counselors = await tx.counselor.findMany({
    where: {
      active: true,
      affiliation: WAP_STAFF_COUNSELOR_AFFILIATION,
      user: { organizationId, deletedAt: null },
    },
    select: { id: true, userId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (counselors.length === 0) return null;

  const loads = await tx.counselorAssignment.groupBy({
    by: ['counselorId'],
    where: {
      active: true,
      counselorId: { in: counselors.map((counselor) => counselor.id) },
    },
    _count: { _all: true },
  });
  const countById = new Map(loads.map((row) => [row.counselorId, row._count._all]));

  let best = counselors[0];
  let bestLoad = countById.get(best.id) ?? 0;
  for (const counselor of counselors.slice(1)) {
    const load = countById.get(counselor.id) ?? 0;
    if (load < bestLoad) {
      best = counselor;
      bestLoad = load;
    }
  }
  return { counselorId: best.id, userId: best.userId };
}

/**
 * Assign a self-serve member to an active WAP counselor when they have none.
 * Uses assignMemberCounselor so lock / dedupe / thread upsert stay in one commit.
 * Does not invent a named fallback account when the pool is empty.
 */
export async function ensureSelfServeCounselorAssigned(input: {
  memberId: string;
  organizationId: string;
}): Promise<EnsureSelfServeCounselorResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.user.updateMany({
      where: {
        id: input.memberId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) {
      return { assigned: false, counselorUserId: null, reason: 'member_unavailable' };
    }

    const existing = await tx.counselorAssignment.findFirst({
      where: { memberId: input.memberId, active: true },
      orderBy: { assignedAt: 'desc' },
      select: { counselor: { select: { userId: true, active: true } } },
    });
    if (existing?.counselor?.active) {
      return {
        assigned: true,
        counselorUserId: existing.counselor.userId,
        reason: 'already_assigned',
      };
    }

    const pick = await pickLeastLoadedWapCounselor(tx, input.organizationId);
    if (!pick) {
      return { assigned: false, counselorUserId: null, reason: 'no_counselors' };
    }

    await assignMemberCounselor(tx, {
      memberId: input.memberId,
      organizationId: input.organizationId,
      counselorUserId: pick.userId,
    });
    return { assigned: true, counselorUserId: pick.userId, reason: 'assigned' };
  });
}
