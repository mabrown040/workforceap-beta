import type { Prisma } from '@prisma/client';
import { isAdmin, isSuperAdmin } from '@/lib/auth/roles';
import { getActorOrganizationId } from '@/lib/tenant/organization';
import { prisma } from '@/lib/db/prisma';

/**
 * Build the per-actor scope filter on `memberFeedback.user`.
 *
 * Returns:
 *   - `undefined` for super-admins (no scope filter)
 *   - `{ organizationId }` for tenant admins
 *   - `{ id: { in: assignedMemberIds } }` for non-admin counselors
 *   - `null` to deny (empty payload)
 */
export async function buildFeedbackUserScope(
  staffUserId: string,
): Promise<Prisma.UserWhereInput | undefined | null> {
  if (await isSuperAdmin(staffUserId)) return undefined;
  if (await isAdmin(staffUserId)) {
    try {
      return { organizationId: await getActorOrganizationId(staffUserId) };
    } catch {
      return null;
    }
  }
  const counselor = await prisma.counselor.findFirst({
    where: { userId: staffUserId, active: true },
    select: { id: true },
  });
  if (!counselor) return null;
  const assignments = await prisma.counselorAssignment.findMany({
    where: { counselorId: counselor.id, active: true },
    select: { memberId: true },
  });
  const ids = assignments.map((a) => a.memberId);
  if (ids.length === 0) return null;
  return { id: { in: ids } };
}

